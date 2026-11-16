export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const SESSION_STORAGE_KEY = 'common_session_token';
let unauthorizedHandler: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function getStoredSessionToken(): string | null {
  try {
    return (
      window.localStorage.getItem(SESSION_STORAGE_KEY) ||
      window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    );
  } catch {
    try {
      return window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      return null;
    }
  }
}

export function setStoredSessionToken(token: string | null) {
  try {
    if (token) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage restriction errors
  }
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage restriction errors
  }
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getStoredSessionToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/api/auth/')) {
      setStoredSessionToken(null);
      unauthorizedHandler?.();
    }
    throw new ApiError(
      data.error ||
        (res.status === 401
          ? 'Authentication required. Please sign in.'
          : 'Request could not be completed. Please try again.'),
      res.status,
      data.fieldErrors
    );
  }
  return data as T;
}

export function formatActivityDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatShortDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDayAndMonth(isoDate: string): { day: string; month: string; weekday: string } {
  const d = new Date(isoDate);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
  };
}

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatRelativeTime(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatInr(amount: number): string {
  if (!amount || amount <= 0) return 'Free';
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function getGoogleMapsDirectionsUrl(lat: number | null, lng: number | null, fallbackQuery: string): string {
  if (lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery)}`;
}

export function getTintSurfaceClasses(tint: string): {
  bg: string;
  border: string;
  chip: string;
  hex: string;
  pinHex: string;
} {
  switch (tint) {
    case 'sage':
      return {
        bg: 'bg-[#CCD5AE]',
        border: 'border-[#B9C496]',
        chip: 'bg-[#E9EDC9]',
        hex: '#CCD5AE',
        pinHex: '#7A8E54',
      };
    case 'peach':
      return {
        bg: 'bg-[#FAEDCD]',
        border: 'border-[#EAD8B0]',
        chip: 'bg-[#FEFAE0]',
        hex: '#FAEDCD',
        pinHex: '#C78548',
      };
    case 'cream':
      return {
        bg: 'bg-[#FEFAE0]',
        border: 'border-[#E8E2C2]',
        chip: 'bg-[#FAEDCD]',
        hex: '#FEFAE0',
        pinHex: '#8E7B56',
      };
    case 'earth':
      return {
        bg: 'bg-[#EAD4BC]',
        border: 'border-[#D4A373]/50',
        chip: 'bg-[#FEFAE0]',
        hex: '#D4A373',
        pinHex: '#A66C3E',
      };
    case 'light-sage':
    default:
      return {
        bg: 'bg-[#E9EDC9]',
        border: 'border-[#D7DEB0]',
        chip: 'bg-[#FEFAE0]',
        hex: '#E9EDC9',
        pinHex: '#5E7446',
      };
  }
}

export const ACTIVITY_IMAGE_PRESETS = [
  {
    label: 'Morning Park Walk (Lodhi)',
    url: '/src/assets/images/hero_delhi_morning_walk_1794851444677.jpg',
  },
  {
    label: 'Garden Café & Sketchbook',
    url: '/src/assets/images/activity_cafe_sketchbook_1794851446562.jpg',
  },
  {
    label: 'Park Badminton & Movement',
    url: '/src/assets/images/activity_badminton_park_1794851446825.jpg',
  },
  {
    label: 'Sunrise Cycling Boulevard',
    url: '/src/assets/images/activity_cycling_trail_1794851445486.jpg',
  },
  {
    label: 'Board Games, Books & Chai',
    url: '/src/assets/images/activity_boardgames_books_1794851447804.jpg',
  },
  {
    label: 'Golden Hour Photowalk',
    url: '/src/assets/images/activity_photography_walk_1794851448216.jpg',
  },
  {
    label: 'Acoustic Courtyard Open Mic',
    url: '/src/assets/images/event_open_mic_courtyard_1794855066863.jpg',
  },
  {
    label: 'Artisanal Food & Chai Table',
    url: '/src/assets/images/event_food_market_delhi_1794855067442.jpg',
  },
  {
    label: 'Aravalli Sunrise Trek',
    url: '/src/assets/images/event_aravalli_sunrise_trek_1794855066292.jpg',
  },
];
