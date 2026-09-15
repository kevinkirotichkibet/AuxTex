const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export type Material = {
  _id: string;
  name: string;
  type: string;
  color: string;
  pricePerMeter: number;
  images: string[];
};

export type Product = {
  _id: string;
  name: string;
  category: string;
  basePrice: number;
  description: string;
  images: string[];
  compatibleMaterials: Material[];
};

export type MeasurementProfile = {
  _id: string;
  label: string;
  unit: string;
  chest: number;
  waist: number;
  hips: number;
  shoulderWidth?: number;
  sleeveLength?: number;
  inseam?: number;
  neck?: number;
  height?: number;
};

export type Order = {
  _id: string;
  price: number;
  status: string;
  createdAt: string;
  productId: Product;
  materialId: Material;
  measurementProfileId: MeasurementProfile;
  userId?: { _id: string; name: string; email: string };
};

export const api = {
  // Auth
  register: (data: { name: string; email: string; password: string }) =>
    request<{ access_token: string; user: { id: string; email: string; roles: string[] } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(data) },
    ),
  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; user: { id: string; email: string; roles: string[] } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(data) },
    ),
  me: () => request<{ userId: string; email: string; roles: string[] }>('/auth/me'),

  // Products
  getProducts: (category?: string) =>
    request<Product[]>(`/products${category ? `?category=${category}` : ''}`),
  getProduct: (id: string) => request<Product>(`/products/${id}`),
  createProduct: (data: {
    name: string;
    category: string;
    basePrice: number;
    description?: string;
    compatibleMaterials?: string[];
  }) => request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),

  // Materials
  getMaterials: (type?: string) =>
    request<Material[]>(`/materials${type ? `?type=${type}` : ''}`),
  createMaterial: (data: {
    name: string;
    type: string;
    color: string;
    pricePerMeter: number;
    stock?: number;
  }) => request<Material>('/materials', { method: 'POST', body: JSON.stringify(data) }),

  // Measurement profiles
  getMeasurementProfiles: () => request<MeasurementProfile[]>('/measurements'),
  createMeasurementProfile: (data: Omit<MeasurementProfile, '_id'>) =>
    request<MeasurementProfile>('/measurements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMeasurementProfile: (id: string, data: Omit<MeasurementProfile, '_id'>) =>
    request<MeasurementProfile>(`/measurements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteMeasurementProfile: (id: string) =>
    request<{ deleted: boolean }>(`/measurements/${id}`, { method: 'DELETE' }),

  // Orders
  createOrder: (data: {
    productId: string;
    materialId: string;
    measurementProfileId: string;
  }) => request<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getOrders: () => request<Order[]>('/orders'),
  getOrder: (id: string) => request<Order>(`/orders/${id}`),
  updateOrder: (id: string, data: { materialId?: string; measurementProfileId?: string }) =>
    request<Order>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelOrder: (id: string) => request<Order>(`/orders/${id}/cancel`, { method: 'PATCH' }),

  // Admin
  adminGetAllOrders: () => request<Order[]>('/orders/admin'),
  adminUpdateOrderStatus: (id: string, status: string) =>
    request<Order>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

export function saveToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem('token', token);
}

export function clearToken() {
  if (typeof window !== 'undefined') localStorage.removeItem('token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function formatKes(amount: number): string {
  return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
