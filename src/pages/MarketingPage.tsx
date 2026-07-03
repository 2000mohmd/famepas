import { useParams } from "react-router-dom";

interface MarketingPageProps {
  path?: string; // e.g. "", "about", "pricing", "legal/privacy-policy"
  dynamicSegment?: "casestudy";
}

const MarketingPage = ({ path, dynamicSegment }: MarketingPageProps) => {
  const params = useParams();
  let resolved = path ?? "";
  if (dynamicSegment === "casestudy" && params.slug) {
    resolved = `casestudy/${params.slug}`;
  }
  const src = `/site/${resolved ? resolved + "/" : ""}index.html`;

  return (
    <iframe
      key={src}
      src={src}
      title="FamePass"
      style={{
        border: 0,
        margin: 0,
        padding: 0,
        width: "100vw",
        height: "100vh",
        display: "block",
      }}
    />
  );
};

export default MarketingPage;
