import type { IdResponse, Result } from '../types'
import { request } from '../utils/request'
export const seckillVoucher = (id: string): Promise<Result<IdResponse>> => request(`/v1/seckill-vouchers/${id}/orders`, { method: 'POST', dedupe: false })
