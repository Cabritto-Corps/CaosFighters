import cors from 'cors'
import dotenv from 'dotenv'
import express, { NextFunction, Request, Response } from 'express'
// import { AuthService } from './domain/services/AuthService'
// import { SupabaseUserGateway } from './infra/gateways/SupabaseUserGateway'

// Carrega variáveis de ambiente
dotenv.config()

const app = express()
const PORT = process.env['PORT'] || 3000

// Middleware
app.use(cors())
app.use(express.json())

// Initialize services
// const userGateway = new SupabaseUserGateway()
// const authService = new AuthService(userGateway)

// Health check route
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'Battle Arena Backend is running'
    })
})

// Authentication routes - temporarily commented out
/*
app.post('/auth/signup', async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, email, password'
            })
        }

        const result = await authService.signUp({ name, email, password })

        if (result.success) {
            return res.status(201).json(result)
        } else {
            return res.status(400).json(result)
        }
    } catch (error) {
        console.error('Signup error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.post('/auth/signin', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: email, password'
            })
        }

        const result = await authService.signIn({ email, password })

        if (result.success) {
            return res.status(200).json(result)
        } else {
            return res.status(401).json(result)
        }
    } catch (error) {
        console.error('Signin error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.post('/auth/signout', async (_req: Request, res: Response) => {
    try {
        const result = await authService.signOut()

        if (result.success) {
            return res.status(200).json(result)
        } else {
            return res.status(500).json(result)
        }
    } catch (error) {
        console.error('Signout error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

// User routes - temporarily commented out
app.get('/users/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            })
        }

        const user = await userGateway.findById(id)

        if (user) {
            return res.json({ success: true, user })
        } else {
            return res.status(404).json({ success: false, error: 'User not found' })
        }
    } catch (error) {
        console.error('Get user error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/users/email/:email', async (req: Request, res: Response) => {
    try {
        const { email } = req.params
        
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            })
        }

        const user = await userGateway.findByEmail(email)

        if (user) {
            return res.json({ success: true, user })
        } else {
            return res.status(404).json({ success: false, error: 'User not found' })
        }
    } catch (error) {
        console.error('Get user by email error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})

app.get('/users/top/:limit', async (req: Request, res: Response) => {
    try {
        const { limit } = req.params
        
        if (!limit) {
            return res.status(400).json({
                success: false,
                error: 'Limit parameter is required'
            })
        }

        const limitNum = parseInt(limit) || 10

        if (limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                success: false,
                error: 'Limit must be between 1 and 100'
            })
        }

        const users = await userGateway.getTopPlayers(limitNum)
        return res.json({ success: true, users, count: users.length })
    } catch (error) {
        console.error('Get top users error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        })
    }
})
*/

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err)
    return res.status(500).json({
        success: false,
        error: 'Internal server error'
    })
})

// 404 handler - catch all unmatched routes
app.use((_req: Request, res: Response) => {
    return res.status(404).json({
        success: false,
        error: 'Route not found'
    })
})

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Battle Arena Backend running on port ${PORT}`)
    console.log(`📊 Health check: http://localhost:${PORT}/health`)
    console.log(`🔐 Auth routes: http://localhost:${PORT}/auth/*`)
    console.log(`👥 User routes: http://localhost:${PORT}/users/*`)
})
