// @ts-check
import { createFeedback, deps, listFeedback } from '../server/feedback.js'

/** @param {Request} req */
export const GET = (req) => listFeedback(req, deps())
/** @param {Request} req */
export const POST = (req) => createFeedback(req, deps())
