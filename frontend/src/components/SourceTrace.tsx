import type { ContentSourceDetail } from '../types';

interface Props {
  detail?: ContentSourceDetail;
}

// The disclosure distinguishes a traceable project material from an official
// difficulty calibration. It makes the content claim auditable without
// overstating what the source proves.
export default function SourceTrace({ detail }: Props) {
  if (!detail) return null;

  return (
    <aside className="source-trace" aria-label="题源信息">
      <div className="source-trace__head">
        <span className="source-trace__badge">题源可追溯</span>
        <span className="source-trace__status">项目资料已核对</span>
      </div>
      <p className="source-trace__main">
        {detail.examDate} {detail.exam} · {detail.paper}
      </p>
      <p className="source-trace__location">{detail.location}</p>
      <details className="source-trace__details">
        <summary>查看资料说明</summary>
        <p>{detail.material}</p>
        <p>{detail.disclosure}</p>
      </details>
    </aside>
  );
}
