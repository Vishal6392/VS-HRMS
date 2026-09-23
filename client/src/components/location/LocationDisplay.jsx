import React from 'react';
import { MapPin, ExternalLink, ShieldCheck } from 'lucide-react';
import { getGoogleMapsUrl, getGPSAccuracyText } from '../../utils/formatters';

export const LocationDisplay = ({
  latitude,
  longitude,
  accuracy,
  timestamp,
  showMapLink = true,
  className = '',
}) => {
  if (latitude === undefined || longitude === undefined) {
    return (
      <div className={`text-xs text-slate-400 flex items-center gap-1.5 ${className}`}>
        <MapPin className="w-3.5 h-3.5 text-slate-300" />
        <span>Location not captured</span>
      </div>
    );
  }

  const mapUrl = getGoogleMapsUrl(latitude, longitude);
  const accuracyText = getGPSAccuracyText(accuracy);

  return (
    <div className={`flex flex-col gap-1 text-xs ${className}`}>
      <div className="flex items-center gap-1.5 font-medium text-slate-700">
        <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
        <span>
          {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
        </span>
      </div>

      <div className="flex items-center gap-2 text-slate-500">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          {accuracyText}
        </span>

        {showMapLink && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-brand-600 hover:text-brand-700 hover:underline font-medium ml-1"
          >
            Open Maps
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};

export default LocationDisplay;
