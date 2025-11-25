// src/app/plot/toastErrors.ts
import { showErrorToast } from "../../utils/toast";

export type ApiErrorCode =
  | "ip_or_name_already_bound"
  | "name_bound_to_different_ip"
  | "name_not_claimed_or_ip_mismatch"
  | "step_not_found"
  | "bad_request"
  | "save_failed";

export function toastApiError(code: ApiErrorCode): void {
  switch (code) {
    case "ip_or_name_already_bound":
      showErrorToast(
        "That name is already locked to a different player on this device. Use the name you first used here."
      );
      break;

    case "name_bound_to_different_ip":
      showErrorToast(
        "That name is already locked to a different player. Use the name you first used."
      );
      break;

    case "name_not_claimed_or_ip_mismatch":
      showErrorToast(
        "This name isn’t available for this device. Use the name you first used here."
      );
      break;

    case "step_not_found":
      showErrorToast("We couldn’t find that step. Refresh and try again.");
      break;

    case "bad_request":
      showErrorToast("Something in the plot looks off. Check and try again.");
      break;

    default:
      showErrorToast("Action failed. Please try again.");
  }
}
