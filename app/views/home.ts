import { Prisma, User } from '@prisma/client'
import dayjs from 'dayjs'
import app from '../client/slack'
import { openProfileModal } from '../modals/profile'
import {
	addUser,
	getNextBirthdays,
	getTodayOccurrencies,
	getUser,
} from '../queries/user'

import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

import relativeTime from 'dayjs/plugin/relativeTime'
import { createTeamModal, editTeamModal } from '../modals/team'
import {
	addTeam,
	addUserToTeam,
	deleteTeam,
	editTeam,
	getAllTeams,
	getOccurrenciesByTimezone,
	getTeam,
	getUserTeams,
	removeUserFromTeam,
} from '../queries/team'
import { KnownBlock } from '@slack/bolt'
import {
	deleteScheduledMessages,
	sendIntro,
	sendMessages,
	sendMessagesByTimezone,
	welcomeUser,
} from '../queries/message'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.extend(relativeTime)

// ————————————————————————————————————————————————————————————
// EVENTS
// ————————————————————————————————————————————————————————————

const homeOpenedEvent = () =>
	app.event('app_home_opened', async ({ event }) => {
		const user_id = event.user
		const user = await getUser({ user_id })
		await generateHome({ user_id })
	})

const userJoinEvent = () =>
	app.event('member_joined_channel', async ({ event }) => {
		const { user } = await app.client.users.info({ user: event.user })

		if (user?.is_bot) return

		const channel = await getTeam({ team_id: event.channel })

		if (!channel) return
		await addUserToTeam({
			team_id: event.channel,
			user_id: event.user,
		})

		await welcomeUser({
			team_id: event.channel,
			user_id: event.user,
		})
	})

const userLeaveEvent = () =>
	app.event('member_left_channel', async ({ event }) => {
		const channel = await getTeam({ team_id: event.channel })
		if (!channel) return
		await removeUserFromTeam({
			team_id: event.channel,
			user_id: event.user,
		})
	})

// ————————————————————————————————————————————————————————————
// PROFILE
// ————————————————————————————————————————————————————————————

const editProfileAction = () => {
	app.action(
		{ type: 'block_actions', action_id: 'edit-profile-action' },
		async ({ ack, body }) => {
			const user_id = body.user.id as string
			const trigger_id = body.trigger_id

			const { birthday, anniversary, isPrivate } = await getUser({
				user_id,
			})

			await openProfileModal({
				user_id,
				birthday,
				anniversary,
				isPrivate,
				trigger_id,
			})

			await ack()
		}
	)
}

const updateBirthdayAction = () =>
	app.action('update-birthday-action', async ({ ack }) => {
		await ack()
	})

const updateAnniversaryAction = () =>
	app.action('update-anniversary-action', async ({ ack }) => {
		await ack()
	})

const updatePrivacyAction = () =>
	app.action('update-privacy-action', async ({ ack }) => {
		await ack()
	})

const updateTimezoneAction = () =>
	app.action('update-timezone-action', async ({ ack }) => {
		await ack()
	})

const updateTimeAction = () =>
	app.action('update-time-action', async ({ ack }) => {
		await ack()
	})

const submitProfileAction = () => {
	app.view('edit-profile-modal', async ({ ack, body, view }) => {
		const birthday =
			view.state.values['birthday-value']['update-birthday-action']
				.selected_date || null
		const anniversary =
			view.state.values['anniversary-value'][
				'update-anniversary-action'
			].selected_date || null

		const isPrivate = view.state.values['privacy-value'][
			'update-privacy-action'
		].selected_options?.length
			? true
			: false

		const user_id = body.user.id

		await addUser({
			user_id,
			birthday,
			anniversary,
			isPrivate,
			isEnabled: true,
		})
		await generateHome({ user_id })
		await ack({
			response_action: 'clear',
		})
	})
}

// ————————————————————————————————————————————————————————————
// TEAM
// ————————————————————————————————————————————————————————————

const createTeamAction = () => {
	app.action(
		{ type: 'block_actions', action_id: 'create-team-action' },
		async ({ body, ack }) => {
			const user_id = body.user.id
			const trigger_id = body.trigger_id

			await createTeamModal({ trigger_id, user_id })
			await ack()
		}
	)
}

const editTeamAction = () =>
	app.action(
		{ action_id: 'edit-team-action' },
		async ({
			ack,
			body,
			action,
		}: {
			action: any
			ack: any
			body: any
		}) => {
			const team_id = action.value
			editTeamModal({ trigger_id: body.trigger_id, team_id })
			await ack()
		}
	)

const submitCreateTeamAction = () => {
	app.view('create-team-modal', async ({ ack, body, view }) => {
		const name = view.state.values['input-name']['team-name']
			.value as string
		const team_id = view.state.values['input-channel']['team-channel']
			.selected_conversation as string
		const user_id = body.user.id as string

		const timezone = view.state.values['input-timezone'][
			'update-timezone-action'
		].selected_option?.value as string
		const time = view.state.values['input-timezone'][
			'update-time-action'
		].selected_time as string

		const { members = [] } = await app.client.conversations.members({
			channel: team_id,
		})

		const checkIfTeamExists = await getTeam({ team_id })

		if (!!checkIfTeamExists) {
			ack({
				response_action: 'errors',
				errors: {
					'input-channel':
						'Sorry, but there is already a team for this channel. Try selecting another one.',
				},
			})
			return
		}

		await addTeam({
			name,
			team_id,
			user_id,
			members,
			time,
			timezone,
		})
		await sendIntro({ team_id })
		await generateHome({ user_id })
		await ack({ response_action: 'clear' })
	})
}

const submitEditTeamAction = () => {
	app.view('edit-team-modal', async ({ ack, body, view }) => {
		const previousTeam_id = view.private_metadata

		const name = view.state.values['input-name']['team-name']
			.value as string
		const team_id = view.state.values['input-channel']['team-channel']
			.selected_conversation as string
		const user_id = body.user.id as string
		const { members = [] } = await app.client.conversations.members({
			channel: team_id,
		})
		const timezone = view.state.values['input-timezone'][
			'update-timezone-action'
		].selected_option?.value as string
		const time = view.state.values['input-timezone'][
			'update-time-action'
		].selected_time as string

		const checkIfTeamExists = await getTeam({ team_id })

		if (previousTeam_id !== team_id && !!checkIfTeamExists) {
			ack({
				response_action: 'errors',
				errors: {
					'input-channel':
						'Sorry, but there is already a team for this channel. Try selecting another one.',
				},
			})
			return
		}

		await editTeam({
			previousTeam_id,
			name,
			team_id,
			user_id,
			members,
			timezone,
			time,
		})
		await generateHome({ user_id })
		await ack({ response_action: 'clear' })
	})
}

const deleteTeamAction = () =>
	app.action(
		{ type: 'block_actions', action_id: 'delete-team-action' },
		async ({ ack, body, action }: any) => {
			const team_id = action.value
			const user_id = body.user.id

			await deleteTeam({ team_id })
			await generateHome({ user_id })

			await app.client.views.update({
				view_id: body.view.id,
				view: {
					type: 'modal',
					title: {
						type: 'plain_text',
						text: 'Team deleted',
						emoji: true,
					},
					close: {
						type: 'plain_text',
						text: 'Cancel',
						emoji: true,
					},
					blocks: [
						{
							type: 'section',
							text: {
								type: 'mrkdwn',
								text: '*Your team has been deleted forever*, sigh.',
							},
						},
					],
				},
			})
			await ack()
		}
	)

// ————————————————————————————————————————————————————————————
// TEST
// ————————————————————————————————————————————————————————————

const testMessagesAction = () =>
	app.action(
		{ type: 'block_actions', action_id: 'test-messages' },
		async ({ ack, body, action }: any) => {
			await sendMessagesByTimezone({ tzCode: 'Europe/Berlin' })
			await ack()
		}
	)

const testDeleteAllAction = () =>
	app.action(
		{ type: 'block_actions', action_id: 'test-delete-all' },
		async ({ ack, body, action }: any) => {
			await deleteScheduledMessages()
			await ack()
		}
	)

// ————————————————————————————————————————————————————————————
// HOME
// ————————————————————————————————————————————————————————————

const generateHome = async ({ user_id }: { user_id: string }) => {
	const {
		birthday,
		anniversary,
		isEnabled,
		isAdmin,
		memberOf,
		isPrivate,
	} = await getUser({
		user_id,
	})

	const teams = await getAllTeams()
	const noTeams: KnownBlock[] =
		teams.length < 1
			? [
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: `No team yet...`,
						},
					},
			  ]
			: []

	let formatTeams: KnownBlock[] = teams.map(
		({ name, team_id, members, createdBy }) => {
			const handleEdit = () => {
				if (user_id === createdBy.user_id || isAdmin)
					return {
						accessory: {
							type: 'button',
							text: {
								type: 'plain_text',
								text: 'Edit',
							},
							value: team_id,
							action_id: 'edit-team-action',
						},
					}

				return {}
			}

			return {
				...{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: `*${name}* \n <#${team_id}>, ${members.length} ${
							members.length > 1 ? 'frogs' : 'frog'
						}`,
					},
					...handleEdit(),
				},
			}
		}
	)

	if (!isEnabled) {
		await app.client.views.publish({
			user_id,
			view: {
				type: 'home',
				blocks: [
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: "Hey there 👋 I'm Birthday Buddy. \n I'm here to help you remember and celebrate important days such as your colleagues' birthdays or work anniversaries.",
						},
					},
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: 'How about setting your birthday and anniversary?',
						},
					},
					{
						type: 'actions',
						elements: [
							{
								type: 'button',
								text: {
									type: 'plain_text',
									text: 'Create Profile',
									emoji: true,
								},
								style: 'primary',
								action_id: 'edit-profile-action',
							},
						],
					},
				],
			},
		})
		return
	}

	const handleAdmin = isAdmin
		? [
				{
					type: 'header',
					text: {
						type: 'plain_text',
						text: ':warning: Test',
						emoji: true,
					},
				},
				{
					type: 'divider',
				},
				{
					type: 'actions',
					elements: [
						{
							type: 'button',
							text: {
								type: 'plain_text',
								text: 'Send Messages',
								emoji: true,
							},
							action_id: 'test-messages',
						},
						{
							type: 'button',
							text: {
								type: 'plain_text',
								text: 'Delete Scheduled Messages',
								emoji: true,
							},
							action_id: 'test-delete-all',
						},
					],
				},
		  ]
		: []

	let formatBirthday = birthday && dayjs(birthday).format('MMMM DD')
	let formatAnniversary =
		anniversary && dayjs(anniversary).format('MMMM DD')

	let daysToBirthday = () => {
		if (!birthday) return 0

		const today = dayjs()

		const thisYear = today.year()
		const nextYear = today.year() + 1

		const thisYearBirthday = dayjs(birthday).year(thisYear)
		const nextYearBirthday = dayjs(birthday).year(nextYear)

		if (
			today.format('YYYY-MM-DD') ===
			thisYearBirthday.format('YYYY-MM-DD')
		) {
			return 0
		} else {
			if (today.isBefore(thisYearBirthday)) {
				if (thisYearBirthday.diff(today, 'day', true) < 1) {
					return 1
				} else {
					return thisYearBirthday.diff(today, 'day')
				}
			} else {
				return nextYearBirthday.diff(today, 'day')
			}
		}
	}

	await app.client.views.publish({
		user_id,
		view: {
			type: 'home',
			blocks: [
				{
					type: 'header',
					text: {
						type: 'plain_text',
						text: ':adult: Personal Information',
						emoji: true,
					},
				},
				{
					type: 'divider',
				},
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: `Hey, <@${user_id}>! \n\n ${
							birthday
								? `:birthday: You are celebrating your birthday on *${formatBirthday}* — ${
										daysToBirthday() === 0
											? `*It's today!* Happy birthday! :tada:`
											: `it's still ${daysToBirthday()} ${
													daysToBirthday() > 1 ? `days` : `day`
											  } away.`
								  }`
								: ":birthday: You haven't set your birthday yet."
						} \n\n ${
							anniversary
								? `:frog: You are celebrating your work anniversary on *${formatAnniversary}*.`
								: ":frog: You haven't set your work anniversary yet."
						} \n\n :raised_hands: You are part of ${
							memberOf.length
						} ${
							memberOf.length === 0 || memberOf.length >= 2
								? `teams`
								: `team`
						}. \n\n ${
							isPrivate
								? `:lock: You are keeping your information private.`
								: `:tada: Your birthday and work anniversary will be shared with your colleagues.`
						}`,
					},
					accessory: {
						type: 'button',
						text: {
							type: 'plain_text',
							text: 'Edit Profile',
							emoji: true,
						},
						style: 'primary',
						action_id: 'edit-profile-action',
					},
				},
				{
					type: 'header',
					text: {
						type: 'plain_text',
						text: ':mega: Teams',
						emoji: true,
					},
				},
				{
					type: 'divider',
				},
				{
					type: 'context',
					elements: [
						{
							type: 'mrkdwn',
							text: `Team is a group of people who wanna track each other's birthdays and work anniversaries.`,
						},
					],
				},
				...noTeams,
				...formatTeams,
				{
					type: 'actions',
					elements: [
						{
							type: 'button',
							text: {
								type: 'plain_text',
								text: 'Add Team',
								emoji: true,
							},
							action_id: 'create-team-action',
						},
					],
				},
				...handleAdmin,
				{
					type: 'divider',
				},
				{
					type: 'context',
					elements: [
						{
							type: 'mrkdwn',
							text: 'Coded with :heart: by Mozz',
						},
					],
				},
			],
		},
	})
}

const homeViewHandler = () => {
	homeOpenedEvent()
	userJoinEvent()
	userLeaveEvent()

	editProfileAction()
	submitProfileAction()
	updateAnniversaryAction()
	updateBirthdayAction()
	updatePrivacyAction()
	updateTimeAction()
	updateTimezoneAction()

	createTeamAction()
	editTeamAction()
	deleteTeamAction()
	submitCreateTeamAction()
	submitEditTeamAction()

	testMessagesAction()
	testDeleteAllAction()
}

export default homeViewHandler
