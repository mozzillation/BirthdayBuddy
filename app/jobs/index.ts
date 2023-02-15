import cron from 'node-cron'
import { sendMessages } from '../queries/message'

const cronJobs = () => {
	// cron.schedule('* * * * *', async () => {
	// 	// 0 0 * * *
	// 	// at midnight every day
	// 	console.log('Midnight')
	// 	await sendMessages()
	// })
}

export default cronJobs
