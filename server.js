import express from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()
const app = express()

app.use(express.json())


// MIDDLEWARE DE AUTENTICAÇÃO (JWT)

function autenticar(req, res, next) {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({
            mensagem: 'Token não informado'
        })
    }

    const token = authHeader.split(' ')[1]

    try {
        jwt.verify(token, process.env.JWT_SECRET)
        next()
    } catch {
        return res.status(401).json({
            mensagem: 'Token inválido'
        })
    }
}


// USUÁRIOS


// Criar usuário
app.post('/usuarios', async (req, res) => {
    try {
        const { name, email, password } = req.body

        const userExists = await prisma.user.findUnique({
            where: { email }
        })

        if (userExists) {
            return res.status(400).json({
                mensagem: 'Email já cadastrado'
            })
        }

        const hash = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hash
            }
        })

        res.status(201).json({
            mensagem: 'Usuário criado com sucesso',
            user
        })

    } catch (error) {
        res.status(500).json({ erro: error.message })
    }
})


// Login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            return res.status(401).json({
                mensagem: 'Usuário não encontrado'
            })
        }

        const senhaValida = await bcrypt.compare(password, user.password)

        if (!senhaValida) {
            return res.status(401).json({
                mensagem: 'Senha incorreta'
            })
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        )

        res.status(200).json({
            mensagem: 'Login realizado com sucesso',
            token
        })

    } catch (error) {
        res.status(500).json({ erro: error.message })
    }
})



// Listar usuários
app.get('/usuarios', autenticar, async (req, res) => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true
        }
    })

    res.json(users)
})


// pegar usuário por ID
app.get('/usuarios/:id', autenticar, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
            id: true,
            name: true,
            email: true
        }
    })

    if (!user) {
        return res.status(404).json({
            mensagem: 'Usuário não encontrado'
        })
    }

    res.json(user)
})



// Atualizar usuário
app.put('/usuarios/:id', autenticar, async (req, res) => {
    const { name, email } = req.body

    const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { name, email }
    })

    res.json(user)
})



// Deletar usuário
app.delete('/usuarios/:id', autenticar, async (req, res) => {
    await prisma.user.delete({
        where: { id: req.params.id }
    })

    res.json({ mensagem: 'Usuário removido com sucesso' })
})






// Criar pizza
app.post('/pizzas', async (req, res) => {
    try {
        const { name, price, description } = req.body

        const pizza = await prisma.pizza.create({
            data: { name, price, description }
        })

        res.status(201).json(pizza)

    } catch (error) {
        res.status(500).json({ erro: error.message })
    }
})



// Listar pizzas
app.get('/pizzas', async (req, res) => {
    const pizzas = await prisma.pizza.findMany()
    res.json(pizzas)
})





// Buscar pizza por ID
app.get('/pizzas/:id', async (req, res) => {
    const pizza = await prisma.pizza.findUnique({
        where: { id: req.params.id }
    })

    if (!pizza) {
        return res.status(404).json({
            mensagem: 'Pizza não encontrada'
        })
    }

    res.json(pizza)
})





// pra atualizar pizza
app.put('/pizzas/:id', async (req, res) => {
    const { name, price, description } = req.body

    const pizza = await prisma.pizza.update({
        where: { id: req.params.id },
        data: { name, price, description }
    })

    res.json(pizza)
})




// deletar pizza
app.delete('/pizzas/:id', async (req, res) => {
    await prisma.pizza.delete({
        where: { id: req.params.id }
    })

    res.json({ mensagem: 'Pizza removida com sucesso' })
})





// pra criar pedido
app.post('/pedidos', async (req, res) => {
    try {
        const { userId, pizzaId, quantity } = req.body

        if (!userId || !pizzaId || !quantity) {
            return res.status(400).json({
                mensagem: 'Preencha todos os campos'
            })
        }

        const pedido = await prisma.order.create({
            data: { userId, pizzaId, quantity }
        })

        res.status(201).json(pedido)

    } catch (error) {
        res.status(500).json({ erro: error.message })
    }
})




// listar os pedidos 
app.get('/pedidos', async (req, res) => {
    try {
        const pedidos = await prisma.order.findMany()

        const completos = await Promise.all(
            pedidos.map(async (p) => {
                const user = await prisma.user.findUnique({
                    where: { id: p.userId },
                    select: { name: true, email: true }
                })

                const pizza = await prisma.pizza.findUnique({
                    where: { id: p.pizzaId }
                })

                return {
                    id: p.id,
                    quantity: p.quantity,
                    status: p.status,
                    user,
                    pizza
                }
            })
        )

        res.json(completos)

    } catch (error) {
        res.status(500).json({ erro: error.message })
    }
})




// status do pedido
app.put('/pedidos/:id', async (req, res) => {
    const { status } = req.body

    const pedido = await prisma.order.update({
        where: { id: req.params.id },
        data: { status }
    })

    res.json(pedido)
})


app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000')
})