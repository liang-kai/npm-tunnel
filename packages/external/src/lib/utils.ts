import { ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 生成4位随机传输码
export function generateTransferCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}
