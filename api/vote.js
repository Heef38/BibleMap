// @ts-check
import { deps, voteFeedback } from '../server/feedback.js'

/** @param {Request} req */
export const POST = (req) => voteFeedback(req, deps())
