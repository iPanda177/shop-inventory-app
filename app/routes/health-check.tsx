import {json} from "@remix-run/node";

export const loader = async () => {
  return json({ message: "OK" }, { status: 200 });
};
