require 'redis'

require_relative '../spec_helper'
require_relative '../../lib/job'
require_relative '../../lib/manager'



class ComplexJobTest
  include Workerholic::Job

  def perform(arg1, arg2, arg3)
    [arg1, arg2, arg3]
  end

  def queue_name
    'test_queue'
  end
end

describe 'dequeuing and processesing of jobs' do
  let(:redis) { Redis.new }

  it 'successfully dequeues and process a simple job' do
    # serialized_job = Workerholic::JobSerializer.serialize([SimpleJobTest, ['test job']])
    # redis.rpush('test_queue', serialized_job)

    # Workerholic::Manager.new.start
    # expect(redis.exists('test_queue')).to eq(false)
    # SimpleJobTest.reset
  end

  it 'successfully dequeues and process a complex job' do
  end

  context 'performing the job raises an error' do
  end
end