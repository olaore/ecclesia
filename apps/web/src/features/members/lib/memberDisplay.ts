import type { Member } from "@nehemiah/core/schemas"

export function getMemberAvatar(member: Pick<Member, "gender" | "ageGroup">) {
  const ageGroup = member.ageGroup

  if (member.gender === "Male") {
    if (ageGroup === "0-10") return "👦"
    if (ageGroup === "11-18") return "🧑"
    if (ageGroup === "51-70" || ageGroup === "71-upwards") return "👴"
    return "👨"
  }

  if (member.gender === "Female") {
    if (ageGroup === "0-10") return "👧"
    if (ageGroup === "11-18") return "🧒"
    if (ageGroup === "51-70" || ageGroup === "71-upwards") return "👵"
    return "👩"
  }

  return "🙂"
}
