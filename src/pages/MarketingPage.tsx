import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

interface MarketingPageProps {
  path?: string; // e.g. "", "about", "pricing", "legal/privacy-policy"
  dynamicSegment?: "casestudy";
}

const MarketingPage = ({ path, dynamicSegment }: MarketingPageProps) => {
  const params = useParams();
  const [srcDoc, setSrcDoc] = useState<string>();
  const src = useMemo(() => {
    let resolved = path ?? "";
    if (dynamicSegment === "casestudy" && params.slug) {
      resolved = `casestudy/${params.slug}`;
    }

    return `/site/${resolved ? resolved + "/" : ""}index.html`;
  }, [dynamicSegment, params.slug, path]);

  useEffect(() => {
    let active = true;

    setSrcDoc(undefined);
    fetch(src)
      .then((response) => response.text())
      .then((html) => {
        if (!active) return;

        const baseHref = `${window.location.origin}${src}`;
        const bootScripts = `<base href="${baseHref}" target="_top"><script src="/site-framer-shim.js"></script>`;
        const patchedHtml = html.includes("<base target=\"_top\">")
          ? html.replace("<base target=\"_top\">", bootScripts)
          : html.replace("<head>", `<head>${bootScripts}`);

        setSrcDoc(patchedHtml);
      })
      .catch(() => {
        if (active) setSrcDoc(undefined);
      });

    return () => {
      active = false;
    };
  }, [src]);

  return (
    <iframe
      key={src}
      src={src}
      srcDoc={srcDoc}
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
