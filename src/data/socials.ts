import { FaGithub, FaLinkedin } from "react-icons/fa6";
import type { IconType } from "react-icons";

export type Social = {
  label: string;
  url: string;
  icon: IconType;
};

export const socials: Social[] = [
  { label: "GitHub", url: "https://github.com/joynto7", icon: FaGithub },
  { label: "LinkedIn", url: "https://www.linkedin.com/in/joynto7/", icon: FaLinkedin },
];
