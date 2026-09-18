import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Nothing here.</h1>
      <p className="text-ink-2 mt-1">
        <Link to="/">Back to the start</Link>
      </p>
    </div>
  )
}
