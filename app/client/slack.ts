import '../utils/env'
import { App } from '@slack/bolt'

const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
	appToken: process.env.SLACK_APP_TOKEN,
	socketMode: process.env.NODE_ENV === 'production' ? false : true,
})

export default app
