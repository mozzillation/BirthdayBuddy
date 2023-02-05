import { PrismaClient, Prisma } from '@prisma/client'
import app from './client/slack'
import homeViewHandler from './views/home'

app.use(async ({ next }) => {
	await next()
})

const run = async () => {
	await app.start(Number(process.env.PORT) || 3000)
	console.log('⚡️ Birthday Buddy is running!')
}

// Home View Events & Actions
homeViewHandler()

run()
