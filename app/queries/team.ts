import { Prisma, PrismaClient } from '@prisma/client'
import { uptime } from 'process'
import app from '../client/slack'

const prisma = new PrismaClient()

const addTeam = async ({
	name,
	team_id,
	user_id,
	members,
}: {
	name: string
	team_id: string
	user_id: string
	members: string[]
}) => {
	const filterMembers = await getMembers({ members })

	const connectOrCreateMembers = {
		connectOrCreate: filterMembers.map((user, index) => {
			return {
				where: {
					user_id: user!.id,
				},
				create: {
					user_id: user!.id,
				},
			}
		}),
	}

	const team = {
		name,
		team_id,
		createdBy: {
			connect: {
				user_id,
			},
		},
		members: filterMembers.length ? connectOrCreateMembers : {},
	}

	await prisma.team
		.create({
			data: team,
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

const editTeam = async ({
	name,
	team_id,
	user_id,
	members,
	previousTeam_id,
}: {
	previousTeam_id: string
	name: string
	team_id: string
	user_id: string
	members: string[]
}) => {
	const filterMembers = await getMembers({ members })

	const connectOrCreateMembers = {
		connectOrCreate: filterMembers.map((user, index) => {
			return {
				where: {
					user_id: user!.id,
				},
				create: {
					user_id: user!.id,
				},
			}
		}),
	}

	const team = {
		name,
		team_id,
		createdBy: {
			connect: {
				user_id,
			},
		},
		members: filterMembers.length ? connectOrCreateMembers : {},
	}

	await prisma.team
		.update({
			where: {
				team_id: previousTeam_id,
			},
			data: team,
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

const getMembers = async ({ members }: { members: string[] }) => {
	let memberInfos = await Promise.all(
		members.map(async (user_id) => {
			const { user } = await app.client.users.info({ user: user_id })
			return user
		})
	)

	let filterMembers = memberInfos.filter((user) => !user?.is_bot)
	return filterMembers
}

const getUserTeams = async ({ user_id }: { user_id: string }) => {
	await prisma.team
		.findMany({
			where: {
				createdBy: {
					user_id,
				},
			},
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

const getAllTeams = async () => {
	return await prisma.team.findMany({
		include: {
			createdBy: true,
			members: true,
		},
	})
}

const getTeam = async ({ team_id }: { team_id: string }) => {
	return await prisma.team.findUnique({
		where: {
			team_id,
		},
	})
}

const deleteTeam = async ({ team_id }: { team_id: string }) => {
	await prisma.team
		.delete({
			where: {
				team_id: team_id,
			},
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

const addUserToTeam = async ({
	team_id,
	user_id,
}: {
	team_id: string
	user_id: string
}) => {
	await prisma.team.update({
		where: {
			team_id,
		},
		data: {
			members: {
				connectOrCreate: {
					where: {
						user_id,
					},
					create: {
						user_id,
					},
				},
			},
		},
	})
}

const removeUserFromTeam = async ({
	team_id,
	user_id,
}: {
	team_id: string
	user_id: string
}) => {
	await prisma.team.update({
		where: { team_id },
		data: {
			members: {
				disconnect: {
					user_id,
				},
			},
		},
		select: {
			members: true,
		},
	})
}

export {
	addTeam,
	getUserTeams,
	getAllTeams,
	getTeam,
	editTeam,
	deleteTeam,
	addUserToTeam,
	removeUserFromTeam,
}
