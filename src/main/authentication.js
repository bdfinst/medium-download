// Authentication validation utilities

export const validateAuthentication = async authService => {
  const authStatus = await authService.getAuthStatus()
  if (!authStatus.authenticated) {
    throw new Error('Authentication required. Please run authentication first.')
  }
  return authStatus
}

export const createAuthValidator = authService => {
  return {
    validate: () => validateAuthentication(authService),
    getStatus: () => authService.getAuthStatus(),
  }
}
