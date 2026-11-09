// Contexte global d'authentification.
// Stocke l'utilisateur courant et expose login/logout/register.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {

}
