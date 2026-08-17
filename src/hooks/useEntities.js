import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useSites(sort = '-created_date', limit = 5000) {
  return useQuery({
    queryKey: ['sites', sort, limit],
    queryFn: () => base44.entities.Site.list(sort, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

export function usePlatforms() {
  return useQuery({
    queryKey: ['platforms'],
    queryFn: () => base44.entities.Platform.list(),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });
}

export function useCameras(siteId) {
  return useQuery({
    queryKey: ['cameras', siteId],
    queryFn: () => siteId ? base44.entities.Camera.filter({ site_id: siteId }) : base44.entities.Camera.list(),
    staleTime: 1000 * 60 * 2,
    enabled: siteId !== undefined,
  });
}

export function useSiteDetail(id) {
  return useQuery({
    queryKey: ['site', id],
    queryFn: () => base44.entities.Site.get(id),
    enabled: !!id,
  });
}

export function useAuditLogs(limit = 20) {
  return useQuery({
    queryKey: ['auditLogs', limit],
    queryFn: () => base44.entities.AuditLog.list('-created_date', limit),
  });
}

export function useMutateSite() {
  const queryClient = useQueryClient();

  const updateSite = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Site.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['sites'] });
      await queryClient.cancelQueries({ queryKey: ['site', id] });

      const previousSites = queryClient.getQueryData(['sites', '-created_date', 5000]);
      const previousSite = queryClient.getQueryData(['site', id]);

      if (previousSites) {
        queryClient.setQueriesData({ queryKey: ['sites'] }, (old) =>
          Array.isArray(old) ? old.map((s) => (s.id === id ? { ...s, ...data } : s)) : old
        );
      }

      if (previousSite) {
        queryClient.setQueryData(['site', id], (old) => (old ? { ...old, ...data } : old));
      }

      return { previousSites, previousSite };
    },
    onError: (err, variables, context) => {
      if (context?.previousSites) {
        queryClient.setQueriesData({ queryKey: ['sites'] }, context.previousSites);
      }
      if (context?.previousSite) {
        queryClient.setQueryData(['site', variables.id], context.previousSite);
      }
      toast.error(`Failed to update site: ${err.message || err}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });

  const createSite = useMutation({
    mutationFn: (data) => base44.entities.Site.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Site created successfully');
    },
    onError: (err) => {
      toast.error(`Failed to create site: ${err.message || err}`);
    },
  });

  const bulkUpdateSites = useMutation({
    mutationFn: async ({ ids, data }) => {
      // Execute parallel updates via Promise.all for high speed
      return Promise.all(ids.map((id) => base44.entities.Site.update(id, data)));
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success(`Successfully updated ${res.length} site(s)`);
    },
    onError: (err) => {
      toast.error(`Bulk operation failed: ${err.message || err}`);
    },
  });

  return { updateSite, createSite, bulkUpdateSites };
}
