// src/services/inventoryApi.ts

import api from './api';

// تعريف الواجهات (Interfaces) لتوحيد البيانات (اختياري ولكن مفضل للمشاريع الكبيرة)
export interface Warehouse {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
}

export const inventoryApi = {
  // ============================================================
  // 1. Warehouses Management (المستودعات)
  // ============================================================
  getWarehouses: () => api.get<Warehouse[]>('/inventory/warehouses'),
  
  createWarehouse: (data: { name: string; location: string; manager_id?: string }) => 
    api.post('/inventory/warehouses', data),

  // ============================================================
  // 2. Stock & Inventory Levels (المخزون)
  // ============================================================
  
  // جلب مخزون مستودع محدد
  getStockByWarehouse: (warehouseId: string) => 
    api.get(`/inventory/stock/${warehouseId}`),

  // جلب حركة مادة معينة (Stock Card / Traceability)
  getStockCard: (articleId: string, warehouseId?: string) => 
    api.get(`/inventory/stock-card/${articleId}?warehouse_id=${warehouseId || ''}`),

  // ============================================================
  // 3. Movements & Delivery Notes (الحركات والمذكرات)
  // ============================================================
  
  // جلب قائمة الحركات (يمكن إضافة فلاتر لاحقاً عبر الـ query params)
  getMovements: () => api.get('/inventory/delivery-notes'),
  
  // جلب تفاصيل حركة واحدة
  getMovementById: (id: string) => api.get(`/inventory/delivery-notes/${id}`),
  
  // إنشاء حركة جديدة (إدخال، إخراج، مناقلة)
  createMovement: (data: any) => api.post('/inventory/delivery-notes', data),
  
  // اعتماد الحركة (تحويل المخزون فعلياً)
  approveMovement: (id: string) => api.post(`/inventory/delivery-notes/${id}/approve`),

  // ============================================================
  // 4. Dashboard Statistics (إحصائيات لوحة التحكم)
  // ============================================================
  /**
   * هذه الدالة ذكية: تحاول جلب الإحصائيات الحقيقية من السيرفر.
   * إذا لم يكن الرابط موجوداً (404) أو حدث خطأ، تعيد بيانات وهمية للعرض.
   */
  getDashboardStats: async () => {
    try {
        // 1. محاولة الاتصال بالباك إند الحقيقي
        // ملاحظة: يجب إنشاء هذا المسار في الباك إند لاحقاً
        const response = await api.get('/inventory/stats'); 
        return response.data;
    } catch (error) {
        console.warn("Dashboard stats endpoint not ready yet. Serving mock data for UI.");
        
        // 2. بيانات وهمية احترافية للعرض (Mock Data)
        return {
            totalValue: 1250000, // $1.25M
            totalItems: 3450,
            activeWarehouses: 3,
            pendingApprovals: 8,
            lowStockItems: 3,
            // نسبة إشغال المستودعات
            capacityMap: [
                { name: 'Main Warehouse (Damascus)', val: 85, color: 'error' },
                { name: 'Aleppo Branch', val: 45, color: 'success' },
                { name: 'Lattakia Port Store', val: 62, color: 'warning' },
                { name: 'Homs Distribution', val: 20, color: 'success' }
            ],
            // آخر التنبيهات
            recentAlerts: [
                { msg: 'White Sugar below min level (50 MT)', time: '2 hours ago', type: 'low' },
                { msg: 'Inbound Shipment #DN-2024-88 Pending Approval', time: '5 hours ago', type: 'pending' },
                { msg: 'Aleppo Warehouse capacity reached 90%', time: '1 day ago', type: 'cap' }
            ]
        };
    }
  }
};