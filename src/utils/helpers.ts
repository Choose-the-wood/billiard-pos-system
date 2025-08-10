// 中文数字转换工具
export function convertChineseNumber(str: string): number {
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
    零: 0,
    两: 2,
  };

  // 如果是阿拉伯数字，直接转换
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  // 处理中文数字
  if (str in chineseNumbers) {
    return chineseNumbers[str];
  }

  // 处理复合数字，如"十二"、"二十"等
  if (str.includes("十")) {
    if (str === "十") return 10;

    if (str.startsWith("十")) {
      // 十一、十二等
      const unit = str.slice(1);
      return 10 + (chineseNumbers[unit] || 0);
    } else if (str.endsWith("十")) {
      // 二十、三十等
      const tens = str.slice(0, -1);
      return (chineseNumbers[tens] || 0) * 10;
    } else {
      // 二十一、三十五等
      const parts = str.split("十");
      const tens = chineseNumbers[parts[0]] || 0;
      const units = chineseNumbers[parts[1]] || 0;
      return tens * 10 + units;
    }
  }

  // 如果无法识别，返回0
  console.warn(`无法识别的数字: ${str}`);
  return 0;
}

// 时间格式化工具
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// 日期格式化工具
export function formatDate(date: Date): string {
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// 日期时间格式化工具
export function formatDateTime(date: Date): string {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// 货币格式化工具
export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

// 时长格式化工具（小时）
export function formatDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}分钟`;
  } else if (hours === Math.floor(hours)) {
    return `${hours}小时`;
  } else {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}小时${minutes}分钟`;
  }
}

// 计算时间差（小时）
export function calculateHoursDiff(
  startTime: Date,
  endTime: Date = new Date()
): number {
  const diffMs = endTime.getTime() - startTime.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
}

// 生成唯一ID
export function generateId(): string {
  return crypto.randomUUID();
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 深拷贝函数
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as T;
  }

  if (typeof obj === "object") {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  return obj;
}

// 本地存储工具
export const storage = {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.error(`获取本地存储失败: ${key}`, error);
      return defaultValue || null;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`设置本地存储失败: ${key}`, error);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`删除本地存储失败: ${key}`, error);
    }
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error("清空本地存储失败", error);
    }
  },
};

// 音频播放工具
export function playSound(
  frequency: number = 800,
  duration: number = 200
): void {
  if (typeof window === "undefined" || !window.AudioContext) {
    return;
  }

  try {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration / 1000
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    console.error("播放提示音失败:", error);
  }
}

// 语音指令解析工具
export function parseVoiceCommand(command: string): {
  action: string;
  tableNumber?: number;
  duration?: number;
  customer?: string;
} | null {
  const cleanCommand = command.trim().toLowerCase();

  // 开台指令
  const openMatch = cleanCommand.match(
    /开(\d+|[一二三四五六七八九十]+)号台(\d+|[一二三四五六七八九十]+)小时/
  );
  if (openMatch) {
    return {
      action: "open",
      tableNumber: convertChineseNumber(openMatch[1]),
      duration: convertChineseNumber(openMatch[2]),
    };
  }

  // VIP台指令
  const vipMatch = cleanCommand.match(
    /开vip台(\d+|[一二三四五六七八九十]+)小时/
  );
  if (vipMatch) {
    return {
      action: "openVip",
      duration: convertChineseNumber(vipMatch[1]),
    };
  }

  // 结账指令
  const closeMatch = cleanCommand.match(
    /(\d+|[一二三四五六七八九十]+)号台结账/
  );
  if (closeMatch) {
    return {
      action: "close",
      tableNumber: convertChineseNumber(closeMatch[1]),
    };
  }

  // 延长指令
  const extendMatch = cleanCommand.match(
    /(\d+|[一二三四五六七八九十]+)号台延长(\d+|[一二三四五六七八九十]+)小时/
  );
  if (extendMatch) {
    return {
      action: "extend",
      tableNumber: convertChineseNumber(extendMatch[1]),
      duration: convertChineseNumber(extendMatch[2]),
    };
  }

  // 查询指令
  if (cleanCommand.includes("查看") || cleanCommand.includes("状态")) {
    return {
      action: "query",
    };
  }

  return null;
}

// 验证手机号
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

// 验证客户姓名
export function validateCustomerName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 20;
}

// 计算台桌收入统计
export function calculateTableStats(orders: any[]) {
  const stats = {
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalHours: 0,
    averageSessionTime: 0,
  };

  if (orders.length === 0) return stats;

  stats.totalOrders = orders.length;
  stats.totalRevenue = orders.reduce((sum, order) => sum + order.paidAmount, 0);
  stats.totalHours = orders.reduce((sum, order) => sum + order.duration, 0);
  stats.averageOrderValue = stats.totalRevenue / stats.totalOrders;
  stats.averageSessionTime = stats.totalHours / stats.totalOrders;

  return stats;
}

// 获取时间段描述
export function getTimeSlotDescription(hour: number): string {
  if (hour >= 6 && hour < 12) return "上午";
  if (hour >= 12 && hour < 18) return "下午";
  if (hour >= 18 && hour < 24) return "晚上";
  return "深夜";
}

// 颜色工具
export const colors = {
  status: {
    available: "#10b981", // green-500
    occupied: "#ef4444", // red-500
    reserved: "#f59e0b", // amber-500
    maintenance: "#6b7280", // gray-500
  },
  tableType: {
    standard: "#3b82f6", // blue-500
    vip: "#8b5cf6", // violet-500
    snooker: "#06b6d4", // cyan-500
  },
};
