import api from "@/lib/api";

export type ModuleLinkItem = {
  id: number;
  label: string;
  url: string;
};

export type ModuleLinks = Record<string, ModuleLinkItem[]>;

export async function getModuleLinks(apiUrl: string, courseId: number): Promise<ModuleLinks> {
  const res = await api.get<ModuleLinks>(`${apiUrl}/api/courses/${courseId}/module-links`);
  return res.data;
}

export async function createModuleLink(
  apiUrl: string,
  courseId: number,
  moduleName: string,
  label: string,
  url: string
): Promise<ModuleLinkItem> {
  const res = await api.post<ModuleLinkItem>(`${apiUrl}/api/courses/${courseId}/module-links`, {
    module_name: moduleName,
    label,
    url,
  });
  return res.data;
}

export async function updateModuleLink(
  apiUrl: string,
  linkId: number,
  label: string,
  url: string
): Promise<ModuleLinkItem> {
  const res = await api.put<ModuleLinkItem>(`${apiUrl}/api/module-links/${linkId}`, { label, url });
  return res.data;
}

export async function deleteModuleLink(apiUrl: string, linkId: number): Promise<void> {
  await api.delete(`${apiUrl}/api/module-links/${linkId}`);
}

export async function getDistinctLabels(apiUrl: string): Promise<string[]> {
  const res = await api.get<string[]>(`${apiUrl}/api/module-link-labels`);
  return res.data;
}
