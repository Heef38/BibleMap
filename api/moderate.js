// @ts-check
import { deps, moderateFeedback } from '../server/feedback.js'

/** @param {Request} req */
export const POST = (req) => moderateFeedback(req, deps())
