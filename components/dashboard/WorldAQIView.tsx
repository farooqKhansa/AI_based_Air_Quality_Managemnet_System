import React, {
  useState,
  useMemo,
  useContext,
  useCallback,
  useEffect,
} from 'react';
import { AppContext } from './context/AppContext';
import { aqiData } from '../../types';
import type { CityData } from '../../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getHourlyForecast } from '../../services/geminiService'; // uses your backend

const getAqiInfo = (aqi: number | undefined | null) => {
  if (aqi === undefined || aqi === null || aqi === -1) {
    return {
      level: 'No Data',
      color: 'bg-slate-300',
      textColor: 'text-slate-400',
      hex: '#cbd5e1',
      gradId: 'gradGray',
    };
  }
  if (aqi <= 50)
    return {
      level: 'Good',
      color: 'bg-green-500',
      textColor: 'text-green-600',
      hex: '#22c55e',
      gradId: 'gradGood',
    };
  if (aqi <= 100)
    return {
      level: 'Moderate',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      hex: '#f59e0b',
      gradId: 'gradModerate',
    };
  if (aqi <= 150)
    return {
      level: 'Sensitive',
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      hex: '#f97316',
      gradId: 'gradSensitive',
    };
  if (aqi <= 200)
    return {
      level: 'Unhealthy',
      color: 'bg-red-500',
      textColor: 'text-red-600',
      hex: '#ef4444',
      gradId: 'gradUnhealthy',
    };
  if (aqi <= 300)
    return {
      level: 'Very Unhealthy',
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      hex: '#a855f7',
      gradId: 'gradVeryUnhealthy',
    };
  return {
    level: 'Hazardous',
    color: 'bg-rose-600',
    textColor: 'text-rose-600',
    hex: '#e11d48',
    gradId: 'gradHazardous',
  };
};

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 500;

const WorldMapPath = () => (
  <path
    d="M972.5,245.5c-2.2,2.8-5.4,4.2-9.6,4.5c-4.2,0.2-8.1-0.9-11.6-3.3c-3.5-2.4-6.3-5.8-8.2-10.1c-1.9-4.3-2.8-9.1-2.4-14.2c0.3-5.1,2.1-9.9,5.2-14.1c3.1-4.2,7.3-7.5,12.3-9.5c5-2,10.4-2.5,15.8-1.5c5.4,1,10.4,3.6,14.6,7.5c4.2,3.9,7.5,8.9,9.5,14.6c2,5.7,2.6,11.8,1.6,17.8c-1,6-3.6,11.5-7.5,16.1c-3.9,4.6-9,8.1-14.8,10.1c-5.8,2-11.9,2.3-17.9,0.9c-6-1.4-11.6-4.5-16.1-8.9c-4.5-4.4-8.1-9.9-10.1-16.1c-2-6.2-2.3-12.8-0.9-18.9c1.4-6.1,4.5-11.7,8.9-16.1c4.4-4.4,9.9-7.8,16.1-9.8c6.2-2,12.8-2.3,18.9-0.9c6.1,1.4,11.7,4.5,16.1,8.9c4.4,4.4,7.8,9.9,9.8,16.1c2,6.2,2.3,12.8,0.9,18.9c-1.4-6.1,4.5-11.7,8.9-16.1c-4.4-4.4-9.9-7.8-16.1-9.8c-6.2-2-12.8-2.3-18.9-0.9c-6.1,1.4-11.7,4.5-16.1,8.9c-4.4-4.4-7.8-9.9-9.8-16.1c2-6.2,2.3-12.8-0.9-18.9c-1.4-6.1-4.5-11.7-8.9-16.1c-4.4-4.4-9.9-7.8-16.1-9.8z"
  />
);

const CityDot: React.FC<{
  city: CityData;
  onHover: (city: CityData | null) => void;
  onClick: () => void;
}> = ({ city, onHover, onClick }) => {
  const x = (city.lon + 180) * (MAP_WIDTH / 360);
  const y = MAP_HEIGHT - (city.lat + 90) * (MAP_HEIGHT / 180);
  const aqiInfo = getAqiInfo(city.aqi);

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={() => onHover(city)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <circle
        r={12}
        fill={aqiInfo.hex}
        className="opacity-30 group-hover:opacity-60 transition-all duration-200"
      />
      <circle r={4} fill={aqiInfo.hex} stroke="#f8fafc" strokeWidth="1" />
    </g>
  );
};

const TrendModal: React.FC<{ city: CityData; onClose: () => void }> = ({
  city,
  onClose,
}) => {
  const [history, setHistory] = useState<{ time: string; aqi: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const locationQuery = `${city.city}, ${city.country}`;
        const forecast = await getHourlyForecast(locationQuery);

        if (cancelled) return;

        const mapped = (forecast || []).map((f: any) => ({
          time: f.time,
          aqi: f.aqi,
        }));

        setHistory(mapped);
      } catch (e) {
        if (cancelled) return;
        console.error('World trend modal forecast error:', e);
        setError('Could not load real AQI trend for this city.');
        setHistory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [city]);

  const hasData = history.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold font-heading text-slate-800">
              {city.city}
            </h3>
            <p className="text-sm text-slate-500">
              {city.country} • AQI trend (next hours)
            </p>
          </div>
          <button onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <svg
              className="w-6 h-6 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="h-64 w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-3" />
              <p className="text-sm font-medium">Loading AQI trend…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full bg-red-50 rounded-xl border border-red-100 text-red-500 text-sm text-center px-4">
              <p className="font-semibold mb-1">Trend unavailable</p>
              <p className="text-red-600/80">{error}</p>
            </div>
          ) : hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="aqi"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
              <svg
                className="w-10 h-10 mb-2 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="font-semibold text-sm">
                No trend data available for this city
              </p>
            </div>
          )}
        </div>

        {hasData && (
          <p className="text-xs text-center text-slate-400 mt-4">
            Data based on OpenWeather air pollution forecast via backend.
          </p>
        )}
      </div>
    </div>
  );
};

export const WorldAQIView: React.FC = () => {
  const context = useContext(AppContext); // currently unused, safe
  const [hoveredCity, setHoveredCity] = useState<CityData | null>(null);
  const [selectedCityForTrend, setSelectedCityForTrend] =
    useState<CityData | null>(null);

  const sortedCities = useMemo(
    () => [...aqiData].sort((a, b) => b.aqi - a.aqi),
    []
  );

  const handleCityClick = useCallback((city: CityData) => {
    setSelectedCityForTrend(city);
  }, []);

  const HoveredCityTooltip: React.FC<{ city: CityData }> = ({ city }) => {
    const x = (city.lon + 180) * (MAP_WIDTH / 360);
    const y = MAP_HEIGHT - (city.lat + 90) * (MAP_HEIGHT / 180);
    const aqiInfo = getAqiInfo(city.aqi);
    const yOffset = y < 50 ? 20 : -30;
    const xOffset = x > MAP_WIDTH - 120 ? -110 : 10;

    return (
      <g
        transform={`translate(${x + xOffset}, ${y + yOffset})`}
        className="pointer-events-none"
      >
        <rect
          x="0"
          y="-22"
          width="120"
          height="40"
          rx="5"
          fill="#ffffff"
          className="opacity-95 shadow-sm"
          stroke="#e2e8f0"
        />
        <text x="8" y="-5" className="fill-text font-semibold text-sm">
          {city.city}
        </text>
        <text
          x="8"
          y="10"
          className={`${aqiInfo.textColor} font-bold text-xs`}
        >
          AQI: {city.aqi === -1 ? 'N/A' : city.aqi}
        </text>
      </g>
    );
  };

  return (
    <div>
      <h1 className="text-3xl font-medium font-heading text-text">
        World AQI Analysis
      </h1>
      <p className="text-text-muted mt-1 mb-6">
        An overview of air quality in major cities across the globe.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-subtle rounded-2xl p-4 flex justify-center items-center shadow-sm relative overflow-hidden">
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="w-full h-auto"
          >
            <g className="fill-slate-200 stroke-background" strokeWidth="0.5">
              <WorldMapPath />
            </g>
            {aqiData.map((city) => (
              <CityDot
                key={city.city}
                city={city}
                onHover={setHoveredCity}
                onClick={() => handleCityClick(city)}
              />
            ))}
            {hoveredCity && <HoveredCityTooltip city={hoveredCity} />}
          </svg>
          <div className="absolute bottom-2 right-2 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded">
            Click a city to view trends
          </div>
        </div>
        <div className="lg:col-span-1 bg-surface border border-subtle rounded-2xl p-4 shadow-sm">
          <h3 className="text-lg font-medium font-heading text-text mb-4">
            City Rankings by AQI
          </h3>
          <div className="space-y-1 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
            {sortedCities.map((city) => {
              const { textColor, color, level } = getAqiInfo(city.aqi);
              return (
                <div
                  key={city.city}
                  onClick={() => handleCityClick(city)}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100 cursor-pointer"
                >
                  <div>
                    <p className="font-semibold text-text text-sm">
                      {city.city}
                    </p>
                    <p className="text-xs text-text-muted">{city.country}</p>
                  </div>
                  <div className="flex items-center">
                    <span className={`font-bold text-sm ${textColor}`}>
                      {city.aqi === -1 ? 'N/A' : city.aqi}
                    </span>
                    <div
                      className={`w-3 h-3 rounded-full ml-2 ${color}`}
                      title={level}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedCityForTrend && (
        <TrendModal
          city={selectedCityForTrend}
          onClose={() => setSelectedCityForTrend(null)}
        />
      )}
    </div>
  );
};
