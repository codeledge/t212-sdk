import { format } from "date-fns";

export const formatDate = (d: string | undefined) =>
  d ? format(new Date(d), "dd MMM yyyy HH:mm") : "—";
