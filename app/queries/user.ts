import { Prisma, PrismaClient } from '@prisma/client'
import dayjs from 'dayjs'
import { getUserTeams } from './team'

const prisma = new PrismaClient()

const addUser = async ({
	user_id,
	birthday,
	anniversary,
	isPrivate,
	isEnabled,
}: Prisma.UserCreateInput) => {
	const birthday_unix = dayjs(birthday).unix()
	const anniversary_unix = dayjs(anniversary).unix()

	const user = {
		user_id,
		birthday,
		anniversary,
		isPrivate,
		isEnabled,
		birthday_unix,
		anniversary_unix,
	}

	await prisma.user
		.upsert({
			where: { user_id },
			create: user,
			update: user,
		})
		.then(async () => {
			await prisma.$disconnect()
		})
		.catch(async (e) => {
			console.error(e)
			await prisma.$disconnect()
			process.exit(1)
		})
}

const getUser = async ({ user_id }: Prisma.UserCreateInput) => {
	const user = await prisma.user.findUnique({
		where: { user_id },
		include: { memberOf: true },
	})
	if (!user)
		return {
			id: null,
			user_id,
			birthday: undefined,
			anniversary: undefined,
			isPrivate: false,
			memberOf: [],
			ownerOf: [],
			isAdmin: false,
			isEnabled: false,
		}
	return {
		...user,
		birthday: user.birthday == null ? undefined : user.birthday,
		anniversary:
			user.anniversary == null ? undefined : user.anniversary,
		isPrivate: user.isPrivate == null ? false : user.isPrivate,
	}
}

const getNextBirthdays = async ({ user_id }: { user_id: string }) => {
	return await prisma.user.findMany({
		where: {
			isEnabled: true,
			isPrivate: false,
		},
		orderBy: {
			birthday_unix: 'asc',
		},
		take: 10,
	})
}

const getTodayOccurrencies = async () => {
	const users = await prisma.user.findMany({
		where: {
			isPrivate: false,
			memberOf: { some: {} },
		},
		include: { memberOf: true },
	})

	const allBirthdays = users.map(
		({ user_id, birthday, memberOf }) => {
			return {
				user_id,
				birthday,
				channels: memberOf,
			}
		}
	)

	const allAnniversaries = users.map(
		({ user_id, anniversary, memberOf }) => {
			return {
				user_id,
				anniversary,
				channels: memberOf,
			}
		}
	)

	const today = dayjs()

	const todayBirthdays = allBirthdays.filter(({ birthday }) => {
		const formatBirthday = dayjs(birthday).format('MM-DD')
		return today.format('MM-DD') === formatBirthday
	})

	const todayAnniversaries = allAnniversaries.filter(
		({ anniversary }) => {
			const formatAnniversary = dayjs(anniversary).format('MM-DD')
			return today.format('MM-DD') === formatAnniversary
		}
	)

	return {
		birthdays: todayBirthdays,
		anniversaries: todayAnniversaries,
	}
}

export { addUser, getUser, getTodayOccurrencies, getNextBirthdays }
