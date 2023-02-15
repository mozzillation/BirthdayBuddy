import app from '../client/slack'
import { getTodayOccurrencies, getUser } from './user'
import fs from 'fs'
import yaml from 'yaml'
import { GiphyFetch } from '@giphy/js-fetch-api'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const birthdayMessagesFile = fs.readFileSync(
	'./app/messages/birthday.yaml',
	'utf8'
)

const gf = new GiphyFetch('zFy2vQO9EeFZl7zZhomm1Z5zF5qQd1kz')

const sendMessages = async () => {
	const { birthdays, anniversaries } = await getTodayOccurrencies()

	const birthdayMessages = yaml.parse(birthdayMessagesFile)

	birthdays.forEach(({ channels, user_id }) => {
		channels.forEach(async ({ team_id, time, timezone }) => {
			const hour = time.slice(0, 2)
			const minute = time.slice(3, 5)
			console.log(hour, minute)

			const post_at = dayjs()
				.tz(timezone)
				.hour(parseInt(hour))
				.minute(parseInt(minute))
				.second(0)
				.add(1, 'day')
				.unix()

			await app.client.chat.scheduleMessage({
				channel: team_id,
				text: 'Buon compleanno fratm',
				post_at,
			})
		})
	})

	// birthdays.forEach(({ channels, user_id }) => {
	// 	channels.forEach(async (channel) => {
	// 		const message =
	// 			birthdayMessages[
	// 				Math.floor(Math.random() * birthdayMessages.length)
	// 			]
	// 		const text = message.replace('{mention}', `<@${user_id}>`)

	// 		const { data: gif } = await gf.random({
	// 			tag: 'birthday',
	// 			type: 'gifs',
	// 		})

	// 		await app.client.chat.postMessage({
	// 			channel: channel.team_id,
	// 			text: `Happy birthday, <@${user_id}>!`,
	// 			blocks: [
	// 				{
	// 					type: 'section',
	// 					text: { type: 'mrkdwn', text },
	// 				},
	// 				{
	// 					type: 'image',
	// 					image_url: gif.images.fixed_width.url,
	// 					alt_text: 'birthday',
	// 				},
	// 			],
	// 		})
	// 	})
	// })

	// anniversaries.forEach(({ channels, user_id, anniversary }) => {
	// 	channels.forEach(async (channel) => {
	// 		const today = dayjs()
	// 		const years = today.diff(dayjs(anniversary), 'year')

	// 		const { data: gif } = await gf.random({
	// 			tag: 'work',
	// 			type: 'gifs',
	// 		})

	// 		await app.client.chat.postMessage({
	// 			channel: channel.team_id,
	// 			text: `Happy work anniversary, <@${user_id}>!`,
	// 			blocks: [
	// 				{
	// 					type: 'section',
	// 					text: {
	// 						type: 'mrkdwn',
	// 						text: `Happy anniversary, <@${user_id}>! \n It has now been ${years} ${
	// 							years > 0 ? 'years' : 'year'
	// 						} since you joined frog. Time flies.`,
	// 					},
	// 				},
	// 				{
	// 					type: 'image',
	// 					image_url: gif.images.fixed_width.url,
	// 					alt_text: 'anniversary',
	// 				},
	// 			],
	// 		})
	// 	})
	// })
}

const welcomeUser = async ({
	team_id,
	user_id,
}: {
	team_id: string
	user_id: string
}) => {
	const { isEnabled } = await getUser({ user_id })

	if (isEnabled) return
	await app.client.chat.postMessage({
		channel: user_id,
		text: `Welcome to <#${team_id}>. `,
		blocks: [
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `Welcome to <#${team_id}>! \n\n In this channel, members are sharing their birthday and work anniversary to celebrate them all together.\n\n If you want to join the party, there is a button for you.`,
				},
			},
			{
				type: 'actions',
				elements: [
					{
						type: 'button',
						text: {
							type: 'plain_text',
							text: ':tada: Create Profile',
							emoji: true,
						},
						style: 'primary',
						action_id: 'edit-profile-action',
					},
				],
			},
		],
	})
}

export { sendMessages, welcomeUser }
