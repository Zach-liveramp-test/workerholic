module Workerholic
  class StatsStorage

    def self.save_job(category, job)
      serialized_job_stats = JobSerializer.serialize(job)

      namespace = "workerholic:stats:#{category}:#{job.klass}"
      storage.push(namespace, serialized_job_stats)
    end

    def self.save_processes_memory_usage
      PIDS.each do |pid|
        size = `ps -p #{Process.pid} -o pid=,rss=`.scan(/\d+/).last
        storage.hash_set('workerholic:stats:memory:processes', pid, size)
      end
    end

    def self.delete_memory_stats
      storage.delete('workerholic:stats:memory:processes')
    end

    class << self
      private

      def storage
        @storage ||= Storage::RedisWrapper.new
      end
    end
  end
end
