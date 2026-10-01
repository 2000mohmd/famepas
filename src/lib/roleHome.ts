/**
 * Where a signed-in user belongs. Kept in one place because this mapping was
 * duplicated across the login redirect and the 404 page, and adding the sales
 * roles broke both: they fell through to the influencer home, which bounced
 * them to the public landing page.
 */
export const roleHome = (role: string | null | undefined) => {
  switch (role) {
    case "admin": return "/admin";
    case "sales_manager":
    case "sales_rep": return "/sales";
    case "venue": return "/venue";
    case "influencer": return "/influencer/home";
    default: return "/welcome";
  }
};
