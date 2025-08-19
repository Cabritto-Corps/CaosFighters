import { NextFunction, Request, Response } from 'express'
import { supabase } from '../infra/supabase/client'

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string
        email: string
        name?: string
    }
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization
        const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token is required'
            })
        }

        // Verify the token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token)

        if (error || !user) {
            return res.status(403).json({
                success: false,
                error: 'Invalid or expired token'
            })
        }

        // Add user info to request object
        req.user = {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.['name']
        }

        return next()
    } catch (error) {
        console.error('Auth middleware error:', error)
        return res.status(500).json({
            success: false,
            error: 'Authentication error'
        })
    }
}

export const optionalAuth = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization
        const token = authHeader && authHeader.split(' ')[1]

        if (token) {
            const { data: { user }, error } = await supabase.auth.getUser(token)

            if (!error && user) {
                req.user = {
                    id: user.id,
                    email: user.email || '',
                    name: user.user_metadata?.['name']
                }
            }
        }

        next()
    } catch (error) {
        console.error('Optional auth middleware error:', error)
        next() // Continue even if auth fails for optional auth
    }
}
