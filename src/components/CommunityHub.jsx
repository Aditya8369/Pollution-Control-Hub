import { useEffect, useState } from 'react';

const STORAGE_KEY = 'pollution-community-reports';

function readReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function CommunityHub() {
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    image: ''
  });

  useEffect(() => {
    setReports(readReports());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  const onSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;

    const newReport = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      description: form.description.trim(),
      image: form.image,
      votes: 0,
      createdAt: new Date().toISOString()
    };

    setReports((prev) => [newReport, ...prev]);
    setForm({ title: '', description: '', image: '' });
  };

  const uploadImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  };

  const vote = (id) => {
    setReports((prev) =>
      prev.map((report) =>
        report.id === id ? { ...report, votes: report.votes + 1 } : report
      )
    );
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Community Contribution</h2>
        <p>Report local pollution issues with evidence and crowd voting</p>
      </div>

      <form className="community-form" onSubmit={onSubmit}>
        <input
          type="text"
          value={form.title}
          placeholder="Issue title (e.g., Garbage burning)"
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
        <textarea
          value={form.description}
          placeholder="Describe location and issue details"
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
        <input type="file" accept="image/*" onChange={uploadImage} />
        <button type="submit">Submit Report</button>
      </form>

      <div className="report-feed">
        {reports.length === 0 ? (
          <p>No reports yet. Be the first to raise an issue.</p>
        ) : (
          reports.map((report) => (
            <article className="report-card" key={report.id}>
              <div className="report-head">
                <h3>{report.title}</h3>
                <button onClick={() => vote(report.id)} type="button">Upvote ({report.votes})</button>
              </div>
              <p>{report.description}</p>
              {report.image && <img src={report.image} alt={report.title} />}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
