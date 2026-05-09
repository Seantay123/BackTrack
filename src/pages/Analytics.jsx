import { Bar } from "react-chartjs-2";
import { analytics } from "../services/mockData";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale);

export default function Analytics() {
  const data = {
    labels: analytics.map((a) => a.name),
    datasets: [
      {
        label: "Contribution Score",
        data: analytics.map((a) => a.score)
      }
    ]
  };

  return (
    <div className="container">
      <h1>Analytics</h1>
      <div className="card">
        <Bar data={data} />
      </div>
    </div>
  );
}