import { MEMBER_PROFILE_EDITOR_ROLES } from "@nehemiah/core/constants";
import type { UserRole } from "@nehemiah/core/schemas";
import { toast } from "sonner";
import { useAuthStore } from "../store/useAuthStore";

type AuthUser = ReturnType<typeof useAuthStore.getState>["user"];

export const hasRequiredRole = (
  role: UserRole | null | undefined,
  allowedRoles: readonly UserRole[]
) => Boolean(role && allowedRoles.includes(role));

export const canEditMemberProfile = (user: AuthUser | null | undefined) =>
  hasRequiredRole(user?.role, MEMBER_PROFILE_EDITOR_ROLES);

export const ensureRoleAccess = ({
  user,
  allowedRoles,
  deniedMessage = "You do not have permissions for this action",
}: {
  user: AuthUser | null | undefined;
  allowedRoles: readonly UserRole[];
  deniedMessage?: string;
}) => {
  if (hasRequiredRole(user?.role, allowedRoles)) {
    return true;
  }

  toast.error(deniedMessage);
  return false;
};
