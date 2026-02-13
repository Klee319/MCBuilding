import { useQuery, useMutation } from '@tanstack/react-query';
import { structuresApi } from '../api/structures';

export function useRenderData(structureId: string | undefined) {
  return useQuery({
    queryKey: ['structure', 'render', structureId],
    queryFn: async () => {
      if (!structureId) throw new Error('Structure ID is required');
      const response = await structuresApi.getRenderData(structureId);
      return response.data;
    },
    enabled: !!structureId,
    staleTime: 1000 * 60 * 30,
  });
}

export function useUploadStructure() {
  return useMutation({
    mutationFn: async ({
      file,
      metadata,
    }: {
      file: File;
      metadata: {
        originalEdition: 'java' | 'bedrock';
        originalVersion: string;
      };
    }) => {
      const response = await structuresApi.upload(file, metadata);
      return response.data;
    },
  });
}

export function useDownloadStructure() {
  return useMutation({
    mutationFn: async ({
      structureId,
      edition,
      version,
    }: {
      structureId: string;
      edition: 'java' | 'bedrock';
      version: string;
    }) => {
      const blob = await structuresApi.download(structureId, edition, version);

      // ダウンロードリンクを作成
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `structure_${structureId}.${edition === 'java' ? 'schem' : 'mcstructure'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
