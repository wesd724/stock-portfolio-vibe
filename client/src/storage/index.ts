import { IPortfolioStorage } from './IPortfolioStorage'
import { SessionStorageAdapter } from './SessionStorageAdapter'
// import { ApiStorageAdapter } from './ApiStorageAdapter' // 로그인 유저용

// 추후 auth 추가 시: isLoggedIn ? new ApiStorageAdapter(userId) : new SessionStorageAdapter()
export function getStorage(): IPortfolioStorage {
  return new SessionStorageAdapter()
}
