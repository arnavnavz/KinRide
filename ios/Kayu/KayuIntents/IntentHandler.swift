import Intents
import CoreLocation

class IntentHandler: INExtension {
    override func handler(for intent: INIntent) -> Any {
        switch intent {
        case is INRequestRideIntent:
            return RequestRideIntentHandler()
        case is INGetRideStatusIntent:
            return GetRideStatusIntentHandler()
        case is INListRideOptionsIntent:
            return ListRideOptionsIntentHandler()
        case is INCancelRideIntent:
            return CancelRideIntentHandler()
        default:
            return self
        }
    }
}

// MARK: - Request Ride

class RequestRideIntentHandler: NSObject, INRequestRideIntentHandling {

    private var baseURL: String {
        SessionManager.shared.getBaseURL()
    }

    func handle(intent: INRequestRideIntent, completion: @escaping (INRequestRideIntentResponse) -> Void) {
        guard let sessionCookie = SessionManager.shared.getSessionCookie() else {
            let response = INRequestRideIntentResponse(code: .failureRequiringAppLaunchNoServiceAvailable, userActivity: nil)
            completion(response)
            return
        }

        let pickup = intent.pickupLocation?.location?.coordinate
        let dropoff = intent.dropoffLocation?.location?.coordinate
        let dropoffName = intent.dropoffLocation?.name ?? ""

        guard dropoff != nil || !dropoffName.isEmpty else {
            let response = INRequestRideIntentResponse(code: .failure, userActivity: nil)
            completion(response)
            return
        }

        let rideType = mapRideOption(intent.rideOptionName?.spokenPhrase)

        var body: [String: Any] = [
            "dropoffAddress": dropoffName,
            "rideType": rideType,
            "preferKin": rideType == "kin",
            "source": "siri",
        ]

        if let p = pickup {
            body["pickupAddress"] = "Current Location"
            body["riderLat"] = p.latitude
            body["riderLng"] = p.longitude
        }

        if let d = dropoff {
            body["dropoffLat"] = d.latitude
            body["dropoffLng"] = d.longitude
        }

        postRideRequest(body: body, cookie: sessionCookie) { result in
            switch result {
            case .success(let rideInfo):
                let response = INRequestRideIntentResponse(code: .success, userActivity: nil)

                let status = INRideStatus()
                status.rideIdentifier = rideInfo.rideId
                status.phase = .received
                status.pickupLocation = intent.pickupLocation
                status.dropOffLocation = intent.dropoffLocation

                let eta = INRideStatus()
                eta.rideIdentifier = rideInfo.rideId
                eta.estimatedPickupDate = Date().addingTimeInterval(TimeInterval(rideInfo.etaMinutes * 60))

                response.rideStatus = status
                completion(response)

            case .failure:
                let activity = NSUserActivity(activityType: "com.kayu.app.bookRide")
                activity.userInfo = ["destination": dropoffName]
                let response = INRequestRideIntentResponse(code: .failureRequiringAppLaunch, userActivity: activity)
                completion(response)
            }
        }
    }

    func resolvePickupLocation(for intent: INRequestRideIntent, with completion: @escaping (INPlacemarkResolutionResult) -> Void) {
        if let pickup = intent.pickupLocation {
            completion(.success(with: pickup))
        } else {
            completion(.notRequired())
        }
    }

    func resolveDropOffLocation(for intent: INRequestRideIntent, with completion: @escaping (INPlacemarkResolutionResult) -> Void) {
        if let dropoff = intent.dropoffLocation {
            completion(.success(with: dropoff))
        } else {
            completion(.needsValue())
        }
    }

    func confirm(intent: INRequestRideIntent, completion: @escaping (INRequestRideIntentResponse) -> Void) {
        guard SessionManager.shared.getSessionCookie() != nil else {
            let activity = NSUserActivity(activityType: "com.kayu.app.signIn")
            let response = INRequestRideIntentResponse(code: .failureRequiringAppLaunch, userActivity: activity)
            completion(response)
            return
        }
        let response = INRequestRideIntentResponse(code: .ready, userActivity: nil)
        completion(response)
    }

    // MARK: - Helpers

    private func mapRideOption(_ spoken: String?) -> String {
        guard let s = spoken?.lowercased() else { return "regular" }
        if s.contains("xl") || s.contains("large") || s.contains("big") { return "xl" }
        if s.contains("premium") || s.contains("luxury") || s.contains("black") { return "premium" }
        if s.contains("pool") || s.contains("share") || s.contains("cheap") { return "pool" }
        if s.contains("kin") { return "kin" }
        return "regular"
    }

    private struct RideInfo {
        let rideId: String
        let etaMinutes: Int
    }

    private func postRideRequest(body: [String: Any], cookie: String, completion: @escaping (Result<RideInfo, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/rides/request") else {
            completion(.failure(NSError(domain: "Kayu", code: -1)))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(cookie, forHTTPHeaderField: "Cookie")

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            completion(.failure(error))
            return
        }

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let rideId = json["id"] as? String else {
                completion(.failure(NSError(domain: "Kayu", code: -2)))
                return
            }

            let eta = json["etaMinutes"] as? Int ?? 5
            completion(.success(RideInfo(rideId: rideId, etaMinutes: eta)))
        }.resume()
    }
}

// MARK: - Get Ride Status

class GetRideStatusIntentHandler: NSObject, INGetRideStatusIntentHandling {
    func handle(intent: INGetRideStatusIntent, completion: @escaping (INGetRideStatusIntentResponse) -> Void) {
        guard let cookie = SessionManager.shared.getSessionCookie() else {
            let response = INGetRideStatusIntentResponse(code: .failureRequiringAppLaunch, userActivity: nil)
            completion(response)
            return
        }

        let baseURL = SessionManager.shared.getBaseURL()
        guard let url = URL(string: "\(baseURL)/api/rides/active") else {
            completion(INGetRideStatusIntentResponse(code: .failure, userActivity: nil))
            return
        }

        var request = URLRequest(url: url)
        request.setValue(cookie, forHTTPHeaderField: "Cookie")

        URLSession.shared.dataTask(with: request) { data, _, _ in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let rideId = json["id"] as? String,
                  let status = json["status"] as? String else {
                completion(INGetRideStatusIntentResponse(code: .failure, userActivity: nil))
                return
            }

            let response = INGetRideStatusIntentResponse(code: .success, userActivity: nil)
            let rideStatus = INRideStatus()
            rideStatus.rideIdentifier = rideId
            rideStatus.phase = self.mapPhase(status)

            if let driverName = json["driverName"] as? String {
                let driver = INRideDriver(personHandle: INPersonHandle(value: driverName, type: .unknown),
                                          nameComponents: nil,
                                          displayName: driverName,
                                          image: nil,
                                          rating: nil,
                                          phoneNumber: nil)
                rideStatus.driver = driver
            }

            response.rideStatus = rideStatus
            completion(response)
        }.resume()
    }

    func startSendingUpdates(for intent: INGetRideStatusIntent, to observer: INGetRideStatusIntentResponseObserver) {}
    func stopSendingUpdates(for intent: INGetRideStatusIntent) {}

    private func mapPhase(_ status: String) -> INRidePhase {
        switch status {
        case "SEARCHING": return .received
        case "ACCEPTED": return .confirmed
        case "ARRIVING": return .approachingPickup
        case "IN_PROGRESS": return .ongoing
        case "COMPLETED": return .completed
        default: return .unknown
        }
    }
}

// MARK: - List Ride Options

class ListRideOptionsIntentHandler: NSObject, INListRideOptionsIntentHandling {
    func handle(intent: INListRideOptionsIntent, completion: @escaping (INListRideOptionsIntentResponse) -> Void) {
        let response = INListRideOptionsIntentResponse(code: .success, userActivity: nil)

        let options: [(String, String, Double)] = [
            ("Regular", "Affordable everyday rides", 1.0),
            ("XL", "Extra space for groups", 1.5),
            ("Premium", "Luxury vehicles", 2.0),
            ("Pool", "Share & save", 0.7),
        ]

        response.rideOptions = options.map { name, desc, multiplier in
            let option = INRideOption(name: name, estimatedPickupDate: Date().addingTimeInterval(300))
            option.disclaimerMessage = desc
            option.availablePartySizeOptions = [
                INRidePartySizeOption(partySizeRange: NSRange(location: 1, length: name == "XL" ? 6 : 4),
                                     sizeDescription: name == "XL" ? "1-6 passengers" : "1-4 passengers",
                                     priceRange: nil)
            ]
            return option
        }

        response.expirationDate = Date().addingTimeInterval(300)
        completion(response)
    }
}

// MARK: - Cancel Ride

class CancelRideIntentHandler: NSObject, INCancelRideIntentHandling {
    func handle(intent: INCancelRideIntent, completion: @escaping (INCancelRideIntentResponse) -> Void) {
        guard let cookie = SessionManager.shared.getSessionCookie(),
              let rideId = intent.rideIdentifier else {
            completion(INCancelRideIntentResponse(code: .failure, userActivity: nil))
            return
        }

        let baseURL = SessionManager.shared.getBaseURL()
        guard let url = URL(string: "\(baseURL)/api/rides/\(rideId)/status") else {
            completion(INCancelRideIntentResponse(code: .failure, userActivity: nil))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(cookie, forHTTPHeaderField: "Cookie")

        let body: [String: Any] = ["status": "CANCELED"]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            if error != nil {
                completion(INCancelRideIntentResponse(code: .failure, userActivity: nil))
                return
            }
            completion(INCancelRideIntentResponse(code: .success, userActivity: nil))
        }.resume()
    }
}
