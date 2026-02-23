"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { searchAddresses, type GeocodeSuggestion, type LatLng } from "@/lib/geocode";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: LatLng) => void;
  placeholder: string;
  label: string;
  dotColor: string;
  showCurrentLocation?: boolean;
}

export function AddressInput({
  value,
  onChange,
  onLocationSelect,
  placeholder,
  label,
  dotColor,
  showCurrentLocation = false,
}: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const results = await searchAddresses(query);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
    setHighlightedIndex(-1);
    setLoading(false);
  }, []);

  const handleInputChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 400);
  };

  const handleSelect = (s: GeocodeSuggestion) => {
    const parts = s.displayName.split(",").slice(0, 3).join(",").trim();
    onChange(parts);
    onLocationSelect({ lat: s.lat, lng: s.lng });
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const useCurrentLocation = async () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        onLocationSelect({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { "User-Agent": "KinRide/1.0" } }
          );
          const data = await res.json();
          if (data.display_name) {
            const parts = data.display_name.split(",").slice(0, 3).join(",").trim();
            onChange(parts);
          } else {
            onChange(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch {
          onChange(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isExpanded = showSuggestions && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${showCurrentLocation ? "pr-10" : ""}`}
          placeholder={placeholder}
          required
          autoComplete="off"
          role="combobox"
          aria-expanded={isExpanded}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined
          }
        />
        {showCurrentLocation && (
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
            aria-label="Use current location"
            title="Use current location"
          >
            {locating ? (
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2m0 16v2M2 12h2m16 0h2" />
              </svg>
            )}
          </button>
        )}
      </div>
      {loading && !showCurrentLocation && (
        <div className="absolute right-3 top-[38px]">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      {isExpanded && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto animate-slide-down"
        >
          {suggestions.map((s, i) => (
            <li
              key={i}
              id={`${listboxId}-option-${i}`}
              role="option"
              aria-selected={i === highlightedIndex}
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-gray-50 last:border-0 flex items-start gap-2 cursor-pointer ${
                i === highlightedIndex ? "bg-primary/10" : "hover:bg-primary/5"
              }`}
            >
              <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-gray-700 line-clamp-2">{s.displayName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
