import { time } from 'console'
import cron from 'node-cron'
import {
	sendMessages,
	sendMessagesByTimezone,
} from '../queries/message'

import { minimalTimezoneSet } from '../utils/timezones'

const midnight = '0 0 * * *' // 0 0 * * *

const cronJobs = () => {
	minimalTimezoneSet.forEach(({ tzCode }) => {
		cron.schedule(
			midnight,
			async () => {
				console.log('Running for timezone:', tzCode)
				await sendMessagesByTimezone({ tzCode })
			},
			{
				scheduled: true,
				timezone: tzCode,
			}
		)
	})
}

export default cronJobs
