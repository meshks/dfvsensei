import type { IdeaInput, IdeaInputRepository } from "./idea-input-repository";

export async function getCurrentIdea(
  ventureId: string,
  repository: IdeaInputRepository,
): Promise<IdeaInput | null> {
  return repository.findCurrentByVenture(ventureId);
}
