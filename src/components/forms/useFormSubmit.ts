"use client";

import { useEffect, useTransition, type Dispatch, type SetStateAction } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

type ActionState = { success: boolean; error: boolean; message?: string };
type Action<T> = (state: ActionState, payload: T) => Promise<ActionState>;

export function useFormSubmit<T>(
  action: Action<T>,
  {
    entity,
    type,
    setOpen,
  }: {
    entity: string;
    type: "create" | "update";
    setOpen: Dispatch<SetStateAction<boolean>>;
  }
) {
  const [state, formAction] = useFormState(action, {
    success: false,
    error: false,
  });
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(`${entity} has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.message || "Something went wrong. Please try again.");
    }
  }, [state, entity, type, setOpen, router]);

  const submit = (payload: T) => startTransition(() => formAction(payload));

  return { state, submit, pending };
}
