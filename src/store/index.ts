import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// 使用浏览器原生的crypto.randomUUID()替代uuid库
const generateId = () => crypto.randomUUID();

// 台桌状态类型
export type TableStatus = "available" | "occupied" | "reserved" | "maintenance";

// 台桌类型
export type TableType = "standard" | "vip" | "snooker";

// 台桌接口
export interface Table {
  id: string;
  name: string;
  status: TableStatus;
  type: TableType;
  hourlyRate: number;
  position: { x: number; y: number };
  // 为了兼容VoiceRecognition组件，添加这些属性
  isOccupied: boolean;
  startTime: Date | null;
  duration: number;
  customerName: string;
  phone?: string;
  totalAmount: number;
  currentSession?: {
    id: string;
    startTime: Date;
    duration: number;
    customer: string;
    phone?: string;
    totalAmount: number;
    paidAmount: number;
  };
  lastMaintenance?: Date;
  totalRevenue: number;
  totalHours: number;
}

// 订单接口
export interface Order {
  id: string;
  tableId: string;
  tableName: string;
  customer: string;
  phone?: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  hourlyRate: number;
  totalAmount: number;
  paidAmount: number;
  status: "active" | "completed" | "cancelled";
  paymentMethod?: "cash" | "card" | "wechat" | "alipay";
  createdAt: Date;
  updatedAt: Date;
}

// 系统统计接口
export interface SystemStats {
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  reservedTables: number;
  maintenanceTables: number;
  todayRevenue: number;
  todayOrders: number;
  averageSessionTime: number;
  peakHours: string[];
}

// Store接口
interface BilliardStore {
  // 状态
  tables: Table[];
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  isVoiceListening: boolean;
  voiceInput: string;
  systemStats: SystemStats;

  // 语音识别相关
  recognition: SpeechRecognition | null;
  isVoiceSupported: boolean;

  // Actions
  initializeTables: () => void;
  updateTable: (tableId: string, updates: Partial<Table>) => void;
  openTable: (
    tableId: string,
    duration: number,
    customer: string,
    phone?: string
  ) => Promise<void>;
  closeTable: (tableId: string, paymentMethod?: string) => Promise<void>;
  extendSession: (tableId: string, additionalHours: number) => Promise<void>;

  // 语音识别
  initVoiceRecognition: () => void;
  startVoiceRecognition: () => void;
  stopVoiceRecognition: () => void;
  processVoiceCommand: (command: string) => Promise<void>;

  // 订单管理
  createOrder: (order: Omit<Order, "id" | "createdAt" | "updatedAt">) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  getOrdersByDate: (date: Date) => Order[];

  // 统计
  updateSystemStats: () => void;
  getTodayRevenue: () => number;
  getTableUtilization: () => number;

  // 错误处理
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

// 初始台桌数据
const initialTables: Table[] = [
  {
    id: generateId(),
    name: "1号台",
    status: "available",
    type: "standard",
    hourlyRate: 30,
    position: { x: 0, y: 0 },
    isOccupied: false,
    startTime: null,
    duration: 0,
    customerName: "",
    totalAmount: 0,
    totalRevenue: 0,
    totalHours: 0,
  },
  {
    id: generateId(),
    name: "2号台",
    status: "available",
    type: "standard",
    hourlyRate: 30,
    position: { x: 1, y: 0 },
    isOccupied: false,
    startTime: null,
    duration: 0,
    customerName: "",
    totalAmount: 0,
    totalRevenue: 0,
    totalHours: 0,
  },
  {
    id: generateId(),
    name: "3号台",
    status: "available",
    type: "vip",
    hourlyRate: 50,
    position: { x: 2, y: 0 },
    isOccupied: false,
    startTime: null,
    duration: 0,
    customerName: "",
    totalAmount: 0,
    totalRevenue: 0,
    totalHours: 0,
  },
  {
    id: generateId(),
    name: "4号台",
    status: "available",
    type: "standard",
    hourlyRate: 30,
    position: { x: 0, y: 1 },
    isOccupied: false,
    startTime: null,
    duration: 0,
    customerName: "",
    totalAmount: 0,
    totalRevenue: 0,
    totalHours: 0,
  },
  {
    id: generateId(),
    name: "5号台",
    status: "available",
    type: "snooker",
    hourlyRate: 40,
    position: { x: 1, y: 1 },
    isOccupied: false,
    startTime: null,
    duration: 0,
    customerName: "",
    totalAmount: 0,
    totalRevenue: 0,
    totalHours: 0,
  },
  {
    id: generateId(),
    name: "6号台",
    status: "available",
    type: "vip",
    hourlyRate: 50,
    position: { x: 2, y: 1 },
    isOccupied: false,
    startTime: null,
    duration: 0,
    customerName: "",
    totalAmount: 0,
    totalRevenue: 0,
    totalHours: 0,
  },
];

// 创建Store
export const useBilliardStore = create<BilliardStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        tables: initialTables,
        orders: [],
        currentOrder: null,
        isLoading: false,
        error: null,
        isVoiceListening: false,
        voiceInput: "",
        recognition: null,
        isVoiceSupported:
          typeof window !== "undefined" && "webkitSpeechRecognition" in window,
        systemStats: {
          totalTables: 6,
          availableTables: 6,
          occupiedTables: 0,
          reservedTables: 0,
          maintenanceTables: 0,
          todayRevenue: 0,
          todayOrders: 0,
          averageSessionTime: 0,
          peakHours: [],
        },

        // 初始化台桌
        initializeTables: () => {
          set({ tables: initialTables });
          get().updateSystemStats();
        },

        // 更新台桌
        updateTable: (tableId: string, updates: Partial<Table>) => {
          set((state) => ({
            tables: state.tables.map((table) =>
              table.id === tableId ? { ...table, ...updates } : table
            ),
          }));
          get().updateSystemStats();
        },

        // 开台
        openTable: async (
          tableId: string,
          duration: number,
          customer: string,
          phone?: string
        ) => {
          set({ isLoading: true, error: null });

          try {
            const table = get().tables.find((t) => t.id === tableId);
            if (!table || table.status !== "available") {
              throw new Error("台桌不可用");
            }

            const sessionId = generateId();
            const startTime = new Date();
            const totalAmount = table.hourlyRate * duration;

            // 创建会话
            const session = {
              id: sessionId,
              startTime,
              duration,
              customer,
              phone,
              totalAmount,
              paidAmount: 0,
            };

            // 更新台桌状态
            get().updateTable(tableId, {
              status: "occupied",
              isOccupied: true,
              startTime,
              duration,
              customerName: customer,
              phone,
              totalAmount,
              currentSession: session,
            });

            // 创建订单
            const order: Order = {
              id: sessionId,
              tableId,
              tableName: table.name,
              customer,
              phone,
              startTime,
              duration,
              hourlyRate: table.hourlyRate,
              totalAmount,
              paidAmount: 0,
              status: "active",
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            get().createOrder(order);

            // 模拟API调用延迟
            await new Promise((resolve) => setTimeout(resolve, 500));

            set({ isLoading: false });
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : "开台失败",
            });
          }
        },

        // 结账
        closeTable: async (tableId: string, paymentMethod = "cash") => {
          set({ isLoading: true, error: null });

          try {
            const table = get().tables.find((t) => t.id === tableId);
            if (!table || !table.currentSession) {
              throw new Error("台桌状态异常");
            }

            const session = table.currentSession;
            const endTime = new Date();
            const actualDuration = Math.ceil(
              (endTime.getTime() - session.startTime.getTime()) /
                (1000 * 60 * 60)
            );
            const finalAmount = table.hourlyRate * actualDuration;

            // 更新订单
            get().updateOrder(session.id, {
              endTime,
              duration: actualDuration,
              totalAmount: finalAmount,
              paidAmount: finalAmount,
              status: "completed",
              paymentMethod: paymentMethod as any,
              updatedAt: new Date(),
            });

            // 更新台桌统计
            get().updateTable(tableId, {
              status: "available",
              isOccupied: false,
              startTime: null,
              duration: 0,
              customerName: "",
              phone: undefined,
              totalAmount: 0,
              currentSession: undefined,
              totalRevenue: table.totalRevenue + finalAmount,
              totalHours: table.totalHours + actualDuration,
            });

            await new Promise((resolve) => setTimeout(resolve, 500));
            set({ isLoading: false });
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : "结账失败",
            });
          }
        },

        // 延长时间
        extendSession: async (tableId: string, additionalHours: number) => {
          set({ isLoading: true, error: null });

          try {
            const table = get().tables.find((t) => t.id === tableId);
            if (!table || !table.currentSession) {
              throw new Error("台桌状态异常");
            }

            const session = table.currentSession;
            const newDuration = session.duration + additionalHours;
            const newTotalAmount = table.hourlyRate * newDuration;

            get().updateTable(tableId, {
              duration: newDuration,
              totalAmount: newTotalAmount,
              currentSession: {
                ...session,
                duration: newDuration,
                totalAmount: newTotalAmount,
              },
            });

            get().updateOrder(session.id, {
              duration: newDuration,
              totalAmount: newTotalAmount,
              updatedAt: new Date(),
            });

            await new Promise((resolve) => setTimeout(resolve, 300));
            set({ isLoading: false });
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : "延长时间失败",
            });
          }
        },

        // 初始化语音识别
        initVoiceRecognition: () => {
          if (!get().isVoiceSupported) return;

          const SpeechRecognition =
            window.webkitSpeechRecognition || window.SpeechRecognition;
          const recognition = new SpeechRecognition();

          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = "zh-CN";

          recognition.onstart = () => {
            set({ isVoiceListening: true, error: null });
          };

          recognition.onresult = (event) => {
            const result = event.results[0][0].transcript;
            set({ voiceInput: result });
            get().processVoiceCommand(result);
          };

          recognition.onerror = (event) => {
            set({
              isVoiceListening: false,
              error: `语音识别错误: ${event.error}`,
            });
          };

          recognition.onend = () => {
            set({ isVoiceListening: false });
          };

          set({ recognition });
        },

        // 开始语音识别
        startVoiceRecognition: () => {
          const { recognition } = get();
          if (recognition) {
            recognition.start();
          }
        },

        // 停止语音识别
        stopVoiceRecognition: () => {
          const { recognition } = get();
          if (recognition) {
            recognition.stop();
          }
        },

        // 处理语音指令
        processVoiceCommand: async (command: string) => {
          const lowerCommand = command.toLowerCase();

          try {
            // 开台指令: "开3号台2小时" 或 "开三号台两小时"
            const openTableMatch = command.match(
              /开(\d+|[一二三四五六七八九十]+)号台(\d+|[一二三四五六七八九十]+)小时/
            );
            if (openTableMatch) {
              const tableNum = convertChineseNumber(openTableMatch[1]);
              const duration = convertChineseNumber(openTableMatch[2]);
              const table = get().tables.find(
                (t) => t.name === `${tableNum}号台`
              );

              if (table) {
                await get().openTable(table.id, duration, `客户${Date.now()}`);
                return;
              }
            }

            // VIP台指令
            const vipMatch = command.match(
              /开vip台(\d+|[一二三四五六七八九十]+)小时/i
            );
            if (vipMatch) {
              const duration = convertChineseNumber(vipMatch[1]);
              const vipTable = get().tables.find(
                (t) => t.type === "vip" && t.status === "available"
              );

              if (vipTable) {
                await get().openTable(
                  vipTable.id,
                  duration,
                  `VIP客户${Date.now()}`
                );
                return;
              }
            }

            // 结账指令
            const closeMatch = command.match(
              /(\d+|[一二三四五六七八九十]+)号台结账/
            );
            if (closeMatch) {
              const tableNum = convertChineseNumber(closeMatch[1]);
              const table = get().tables.find(
                (t) => t.name === `${tableNum}号台`
              );

              if (table) {
                await get().closeTable(table.id);
                return;
              }
            }

            throw new Error("无法识别的指令");
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "指令执行失败",
            });
          }
        },

        // 创建订单
        createOrder: (orderData) => {
          const order: Order = {
            ...orderData,
            id: generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          set((state) => ({
            orders: [...state.orders, order],
          }));
        },

        // 更新订单
        updateOrder: (orderId: string, updates: Partial<Order>) => {
          set((state) => ({
            orders: state.orders.map((order) =>
              order.id === orderId
                ? { ...order, ...updates, updatedAt: new Date() }
                : order
            ),
          }));
        },

        // 获取指定日期订单
        getOrdersByDate: (date: Date) => {
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);

          return get().orders.filter(
            (order) =>
              order.createdAt >= startOfDay && order.createdAt <= endOfDay
          );
        },

        // 更新系统统计
        updateSystemStats: () => {
          const { tables, orders } = get();
          const today = new Date();
          const todayOrders = get().getOrdersByDate(today);

          const stats: SystemStats = {
            totalTables: tables.length,
            availableTables: tables.filter((t) => t.status === "available")
              .length,
            occupiedTables: tables.filter((t) => t.status === "occupied")
              .length,
            reservedTables: tables.filter((t) => t.status === "reserved")
              .length,
            maintenanceTables: tables.filter((t) => t.status === "maintenance")
              .length,
            todayRevenue: todayOrders.reduce(
              (sum, order) => sum + order.paidAmount,
              0
            ),
            todayOrders: todayOrders.length,
            averageSessionTime:
              todayOrders.length > 0
                ? todayOrders.reduce((sum, order) => sum + order.duration, 0) /
                  todayOrders.length
                : 0,
            peakHours: calculatePeakHours(todayOrders),
          };

          set({ systemStats: stats });
        },

        // 获取今日收入
        getTodayRevenue: () => {
          return get().systemStats.todayRevenue;
        },

        // 获取台桌利用率
        getTableUtilization: () => {
          const { tables } = get();
          const occupiedCount = tables.filter(
            (t) => t.status === "occupied"
          ).length;
          return tables.length > 0 ? (occupiedCount / tables.length) * 100 : 0;
        },

        // 设置错误
        setError: (error: string | null) => {
          set({ error });
        },

        // 设置加载状态
        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
        },
      }),
      {
        name: "billiard-store",
        partialize: (state) => ({
          tables: state.tables,
          orders: state.orders,
          systemStats: state.systemStats,
        }),
      }
    ),
    { name: "billiard-store" }
  )
);

// 辅助函数：中文数字转换
function convertChineseNumber(str: string): number {
  const chineseNumbers: { [key: string]: number } = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };

  return chineseNumbers[str] || parseInt(str) || 0;
}

// 辅助函数：计算高峰时段
function calculatePeakHours(orders: Order[]): string[] {
  const hourCounts: { [hour: string]: number } = {};

  orders.forEach((order) => {
    const hour = order.startTime.getHours();
    const hourStr = `${hour}:00-${hour + 1}:00`;
    hourCounts[hourStr] = (hourCounts[hourStr] || 0) + 1;
  });

  const sortedHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => hour);

  return sortedHours;
}
