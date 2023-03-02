import app from '../client/slack'
import { getTodayOccurrencies, getUser } from './user'
import fs from 'fs'
import yaml from 'yaml'
import { GiphyFetch } from '@giphy/js-fetch-api'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { getOccurrenciesByTimezone } from './team'
import {
	ChatScheduledMessagesListResponse,
	ScheduledMessage,
} from '@slack/web-api/dist/response/ChatScheduledMessagesListResponse'
import { ChatScheduledMessagesListArguments } from '@slack/web-api'

dayjs.extend(utc)
dayjs.extend(timezone)

const birthdayMessagesFile = fs.readFileSync(
	'./app/messages/birthday.yaml',
	'utf8'
)

const gf = new GiphyFetch('zFy2vQO9EeFZl7zZhomm1Z5zF5qQd1kz')

const sendMessagesByTimezone = async ({
	tzCode,
}: {
	tzCode: string
}) => {
	const { birthdays, anniversaries } =
		await getOccurrenciesByTimezone({ tzCode })

	const birthdayMessages = yaml.parse(birthdayMessagesFile)

	birthdays.forEach(async ({ channel, user_id, postAt }) => {
		const hour = postAt.slice(0, 2)
		const minute = postAt.slice(3, 5)

		const post_at = dayjs()
			.hour(parseInt(hour))
			.minute(parseInt(minute))
			.second(0)
			.tz(tzCode)
			.unix()

		const { data: gif } = await gf.random({
			tag: 'birthday',
			type: 'gifs',
		})

		const message =
			birthdayMessages[
				Math.floor(Math.random() * birthdayMessages.length)
			]

		const text = message.replace('{mention}', `<@${user_id}>`)

		await app.client.chat.scheduleMessage({
			channel,
			text: `Happy Birthday, <@${user_id}>!`,
			post_at,
			blocks: [
				{
					type: 'section',
					text: { type: 'mrkdwn', text },
				},
				{
					type: 'image',
					image_url: gif.images.fixed_width.url,
					alt_text: 'birthday',
				},
			],
		})
	})
}

const deleteScheduledMessages = async () => {
	const messages: ChatScheduledMessagesListResponse =
		await app.client.chat.scheduledMessages.list()

	console.log(messages.scheduled_messages)

	messages.scheduled_messages?.forEach(async ({ channel_id, id }) => {
		await app.client.chat.deleteScheduledMessage({
			channel: channel_id!,
			scheduled_message_id: id!,
		})
	})

	console.log(await app.client.chat.scheduledMessages.list())
}

const sendMessages = async ({ tzCode }: { tzCode: string }) => {
	const { birthdays, anniversaries } = await getTodayOccurrencies()

	const birthdayMessages = yaml.parse(birthdayMessagesFile)

	birthdays.forEach(({ channels, user_id }) => {
		channels.forEach(async ({ team_id, time, timezone }) => {
			const hour = time.slice(0, 2)
			const minute = time.slice(3, 5)

			const message =
				birthdayMessages[
					Math.floor(Math.random() * birthdayMessages.length)
				]
			const text = message.replace('{mention}', `<@${user_id}>`)

			const post_at = dayjs()
				.hour(parseInt(hour))
				.minute(parseInt(minute))
				.second(0)
				.add(1, 'day')
				.unix()

			const { data: gif } = await gf.random({
				tag: 'birthday',
				type: 'gifs',
			})

			await app.client.chat.scheduleMessage({
				channel: team_id,
				text: `Happy Birthday, <@${user_id}>!`,
				post_at,
				blocks: [
					{
						type: 'section',
						text: { type: 'mrkdwn', text },
					},
					{
						type: 'image',
						image_url: gif.images.fixed_width.url,
						alt_text: 'birthday',
					},
				],
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

const sendIntro = async ({ team_id }: { team_id: string }) => {
	await app.client.chat.postMessage({
		channel: team_id,
		text: `Ehi, <#${team_id}>. Birthday Buddy here!`,
		blocks: [
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `Hey <#${team_id}>! \n\nI have been given the best position in the company: CEO of celebrations! \n\nI keep the team informed about upcoming birthdays and when the special day arrives. \n\nI look forward to celebrating many birthdays and work anniversaries to come. \n\n If you want to join the party, here's a button for you :point_down:`,
				},
			},
			{
				type: 'actions',
				elements: [
					{
						type: 'button',
						text: {
							type: 'plain_text',
							text: ':tada: Share your special days',
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

export {
	sendMessages,
	welcomeUser,
	sendIntro,
	sendMessagesByTimezone,
	deleteScheduledMessages,
}
