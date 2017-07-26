$LOAD_PATH << __dir__

require 'yaml'
require 'redis'
require 'connection_pool'
require 'logger'
require 'pry-byebug'

require 'workerholic/manager'
require 'workerholic/worker_balancer'

require 'workerholic/job'
require 'workerholic/job_wrapper'

require 'workerholic/worker'
require 'workerholic/job_processor'
require 'workerholic/job_scheduler'
require 'workerholic/job_retry'

require 'workerholic/storage'
require 'workerholic/sorted_set'
require 'workerholic/queue'

require 'workerholic/job_serializer'
require 'workerholic/statistics'
require 'workerholic/log_manager'

require_relative '../app_test/job_test' # require the application code

module Workerholic
  # DEFAULTS = {
  #   workers_count: 25
  # }

  def self.workers_count
    @workers_count || 25 # DEFAULTS[:workers_count]
  end

  def self.workers_count=(num)
    raise ArgumentError unless num.is_a?(Integer) && num < 200
    @workers_count = num
  end

  def self.redis_pool
    @redis ||= ConnectionPool.new(size: workers_count + 5, timeout: 5) { Redis.new }
  end
end
