export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthFieldErrors {
  email?: string
  password?: string
}

export interface AuthUser {
  id: number
  email: string
  display_name: string
  username: string
  is_vip: boolean
  created_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: AuthUser
}
