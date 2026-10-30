using Cubitos.Publisher.Dashboard.Core.Navigation;

namespace Cubitos.Publisher.Dashboard.Tests;

public class NotchStateMachineTests
{
    private static TimeSpan Ms(int ms) => TimeSpan.FromMilliseconds(ms);

    [Fact]
    public void Starts_collapsed_or_pinned()
    {
        Assert.Equal(NotchState.Collapsed, new NotchStateMachine().State);
        var pinned = new NotchStateMachine(pinned: true);
        Assert.Equal(NotchState.Pinned, pinned.State);
        Assert.Equal(1, pinned.Open, 6);
        Assert.Equal(1, pinned.Pin, 6);
    }

    [Fact]
    public void Hover_expands_and_exit_collapses_only_after_the_delay()
    {
        var notch = new NotchStateMachine();
        Assert.True(notch.PointerEntered(Ms(0)));
        Assert.Equal(NotchState.Expanded, notch.State);

        notch.PointerExited(Ms(1000));
        notch.Advance(Ms(1000 + 399), 0.016);
        Assert.Equal(NotchState.Expanded, notch.State);

        notch.Advance(Ms(1000 + 400), 0.016);
        Assert.Equal(NotchState.Collapsed, notch.State);
    }

    [Fact]
    public void Reentering_before_the_delay_cancels_the_collapse()
    {
        var notch = new NotchStateMachine();
        notch.PointerEntered(Ms(0));
        notch.PointerExited(Ms(100));
        Assert.False(notch.PointerEntered(Ms(300)));
        notch.Advance(Ms(2000), 0.016);
        Assert.Equal(NotchState.Expanded, notch.State);
        Assert.Null(notch.CollapseAt);
    }

    [Fact]
    public void Pinned_ignores_pointer_exit_and_unpinning_outside_schedules_a_collapse()
    {
        var notch = new NotchStateMachine();
        notch.PointerEntered(Ms(0));
        notch.TogglePin(Ms(50));
        Assert.Equal(NotchState.Pinned, notch.State);

        notch.PointerExited(Ms(100));
        notch.Advance(Ms(5000), 0.016);
        Assert.Equal(NotchState.Pinned, notch.State);

        notch.TogglePin(Ms(6000)); // pointer is outside: collapse after the delay
        Assert.Equal(NotchState.Expanded, notch.State);
        notch.Advance(Ms(6400), 0.016);
        Assert.Equal(NotchState.Collapsed, notch.State);
    }

    [Fact]
    public void Unpinning_while_hovering_keeps_the_panel_open()
    {
        var notch = new NotchStateMachine(pinned: true);
        notch.PointerEntered(Ms(0));
        notch.TogglePin(Ms(10));
        notch.Advance(Ms(5000), 0.016);
        Assert.Equal(NotchState.Expanded, notch.State);
    }

    [Fact]
    public void Open_progress_springs_to_the_target_in_about_300_ms()
    {
        var notch = new NotchStateMachine();
        notch.PointerEntered(Ms(0));
        var t = 0;
        for (; t < 300; t += 33) notch.Advance(Ms(t), 0.033);
        Assert.InRange(notch.Open, 0.9, 1.15); // springy: may overshoot a little

        for (; t < 1500; t += 33) notch.Advance(Ms(t), 0.033);
        Assert.Equal(1, notch.Open, 3);
        Assert.Equal(0, notch.Pin, 3);
        Assert.False(notch.IsAnimating);
    }

    [Fact]
    public void Pin_progress_follows_the_pinned_state()
    {
        var notch = new NotchStateMachine();
        notch.PointerEntered(Ms(0));
        notch.TogglePin(Ms(0));
        for (var t = 0; t < 1500; t += 33) notch.Advance(Ms(t), 0.033);
        Assert.Equal(1, notch.Pin, 3);
    }

    [Fact]
    public void Force_jumps_without_animation()
    {
        var notch = new NotchStateMachine();
        notch.Force(NotchState.Expanded);
        Assert.Equal(1, notch.Open, 6);
        Assert.Equal(0, notch.Pin, 6);
        notch.PointerExited(Ms(0));
        notch.Advance(Ms(500), 0.016);
        Assert.Equal(NotchState.Expanded, notch.State); // a forced state is not collapsed by pointer events it never saw
    }

    [Fact]
    public void Stagger_reveals_entries_one_after_another()
    {
        Assert.Equal(0, NotchStateMachine.Stagger(0, 0), 6);
        Assert.Equal(1, NotchStateMachine.Stagger(1, 3), 6);
        Assert.True(NotchStateMachine.Stagger(0.5, 0) > NotchStateMachine.Stagger(0.5, 3));
    }

    [Theory]
    [InlineData(0, PumpkinMood.Flicker, 0)]
    [InlineData(4.0, PumpkinMood.Wink, 0)]
    [InlineData(6.0, PumpkinMood.Wink, 0.5)]
    [InlineData(-3, PumpkinMood.Flicker, 0)]
    public void Pumpkin_idle_cycle_changes_mood_every_period(double seconds, PumpkinMood mood, double phase)
    {
        var (m, p) = PumpkinIdleCycle.At(seconds);
        Assert.Equal(mood, m);
        Assert.Equal(phase, p, 6);
    }

    [Fact]
    public void Pumpkin_idle_cycle_visits_every_mood_and_wraps()
    {
        var cycle = PumpkinIdleCycle.Period.TotalSeconds * PumpkinIdleCycle.Length;
        var seen = Enumerable.Range(0, PumpkinIdleCycle.Length)
            .Select(i => PumpkinIdleCycle.At(i * PumpkinIdleCycle.Period.TotalSeconds).Mood).ToHashSet();
        Assert.Equal(Enum.GetValues<PumpkinMood>().ToHashSet(), seen);
        Assert.Equal(PumpkinIdleCycle.At(1.5), PumpkinIdleCycle.At(cycle + 1.5));
    }

    [Theory]
    [InlineData("--size=1100x720", 1100, 720)]
    [InlineData("--size=2560X1440", 2560, 1440)]
    public void Launch_size_parses_width_and_height(string arg, double w, double h)
    {
        Assert.Equal((w, h), LaunchArgs.Size([arg]));
    }

    [Theory]
    [InlineData("--size=big")]
    [InlineData("--size=0x720")]
    [InlineData("--other=1x1")]
    public void Launch_size_rejects_bad_values(string arg) => Assert.Null(LaunchArgs.Size([arg]));

    [Theory]
    [InlineData("--notch=collapsed", NotchState.Collapsed)]
    [InlineData("--notch=Expanded", NotchState.Expanded)]
    [InlineData("--notch=pinned", NotchState.Pinned)]
    public void Launch_notch_parses_state(string arg, NotchState state) => Assert.Equal(state, LaunchArgs.Notch([arg]));

    [Fact]
    public void Launch_notch_ignores_unknown_values() => Assert.Null(LaunchArgs.Notch(["--notch=open"]));
}
