import { Prisma, User } from '@prisma/client'
import { Option } from '@slack/bolt'
import app from '../client/slack'
import { addUser } from '../queries/user'

interface ProfileModalProps {
	user_id: string
	trigger_id: string
	birthday: string | undefined
	anniversary: string | undefined
	isPrivate: boolean
}

const openProfileModal = async ({
	trigger_id,
	birthday,
	anniversary,
	isPrivate,
}: ProfileModalProps) => {
	const handlePrivacy = () =>
		isPrivate
			? {
					initial_options: [
						{
							value: 'isPrivate',
							text: {
								type: 'plain_text',
								text: 'Keep my birthday and anniversary private',
							},
						},
					],
			  }
			: null

	await app.client.views.open({
		trigger_id,
		view: {
			callback_id: 'edit-profile-modal',
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Your Profile',
				emoji: true,
			},
			submit: {
				type: 'plain_text',
				text: 'Submit',
				emoji: true,
			},
			close: {
				type: 'plain_text',
				text: 'Cancel',
				emoji: true,
			},
			blocks: [
				{
					type: 'input',
					block_id: 'birthday-value',
					label: {
						type: 'plain_text',
						text: 'Pick your date of birth',
					},
					element: {
						type: 'datepicker',
						initial_date: birthday,
						placeholder: {
							type: 'plain_text',
							text: 'Select a date',
							emoji: true,
						},
						action_id: 'update-birthday-action',
					},
				},
				{
					type: 'input',
					block_id: 'anniversary-value',
					label: {
						type: 'plain_text',
						text: 'Pick your work anniversary',
					},
					element: {
						type: 'datepicker',
						initial_date: anniversary,
						placeholder: {
							type: 'plain_text',
							text: 'Select a date',
							emoji: true,
						},
						action_id: 'update-anniversary-action',
					},
				},
				{
					type: 'section',
					block_id: 'privacy-value',
					text: {
						type: 'mrkdwn',
						text: '*Privacy*',
					},
					accessory: {
						type: 'checkboxes',
						...handlePrivacy(),
						options: [
							{
								value: 'isPrivate',
								text: {
									type: 'plain_text',
									text: 'Keep my birthday and anniversary private',
								},
							},
						],
						action_id: 'update-privacy-action',
					},
				},
				{
					type: 'context',
					elements: [
						{
							type: 'mrkdwn',
							text: "Birthday Buddy won't post birthday or anniversary wishes to the team channel.",
						},
					],
				},
			],
		},
	})
}

export { openProfileModal }
