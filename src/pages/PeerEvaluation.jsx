export default function PeerEvaluation() {
  return (
    <div className="container">
      <h1>Peer Evaluation</h1>

      <div className="card">
        <input type="number" placeholder="1–5 rating" min="1" max="5" />
        <textarea placeholder="Feedback..." />
        <button>Submit</button>
      </div>
    </div>
  );
}